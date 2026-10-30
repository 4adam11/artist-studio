import { Router } from 'express';
import { buildOrderItems, fulfillOrder, newOrder, publicOrder } from '../orders.js';
import { isSpam, rateLimit } from '../middleware.js';
import { checkoutSchema, commentSchema, contactSchema, validate } from '../validate.js';

const TEN_MINUTES = 10 * 60 * 1000;

const publicComment = ({ id, name, message, createdAt }) => ({ id, name, message, createdAt });

export function publicRoutes({ store, config, mailer, payments }) {
  const router = Router();
  const formLimit = rateLimit({ windowMs: TEN_MINUTES, max: 10 });
  const checkoutLimit = rateLimit({ windowMs: TEN_MINUTES, max: 20 });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/config', (req, res) => {
    res.json({ currency: config.currency, onlinePayments: Boolean(payments) });
  });

  router.get('/artworks', (req, res) => {
    res.json(store.all('artworks'));
  });

  router.get('/artworks/:id', (req, res) => {
    const artwork = store.find('artworks', req.params.id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    res.json(artwork);
  });

  router.get('/artworks/:id/comments', (req, res) => {
    const artwork = store.find('artworks', req.params.id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    res.json(store.where('comments', (comment) => comment.artworkId === artwork.id).map(publicComment));
  });

  router.post('/artworks/:id/comments', formLimit, async (req, res) => {
    const artwork = store.find('artworks', req.params.id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const { value, error } = validate(req.body, commentSchema);
    if (error) return res.status(400).json({ error });
    if (isSpam(req.body)) return res.status(201).json({ id: 0, ...value, createdAt: new Date().toISOString() });

    const comment = await store.insert('comments', { artworkId: artwork.id, ...value, createdAt: new Date().toISOString() });
    res.status(201).json(publicComment(comment));
  });

  router.get('/products', (req, res) => {
    res.json(store.all('products'));
  });

  router.get('/products/:id', (req, res) => {
    const product = store.find('products', req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  });

  router.post('/contact', formLimit, async (req, res) => {
    const { value, error } = validate(req.body, contactSchema);
    if (error) return res.status(400).json({ error });
    if (isSpam(req.body)) return res.json({ ok: true });

    const message = await store.insert('messages', { ...value, read: false, createdAt: new Date().toISOString() });
    await mailer.contactReceived(message);
    res.json({ ok: true });
  });

  router.post('/checkout', checkoutLimit, async (req, res) => {
    const { value: customer, error } = validate(req.body, checkoutSchema);
    if (error) return res.status(400).json({ error });

    const { items, total, error: itemsError } = buildOrderItems(store, req.body.items);
    if (itemsError) return res.status(400).json({ error: itemsError });

    const order = await store.insert('orders', newOrder({ ...customer, items, total, status: 'awaiting_payment' }));

    // Without Stripe the order is accepted right away and paid by invoice.
    if (!payments) {
      await fulfillOrder({ store, mailer, currency: config.currency }, order, 'received');
      return res.status(201).json({ token: order.token });
    }

    try {
      const session = await payments.createCheckoutSession(order);
      await store.update('orders', order.id, { stripeSessionId: session.id });
      res.status(201).json({ token: order.token, paymentUrl: session.url });
    } catch (stripeError) {
      console.error('[stripe] Could not start checkout:', stripeError.message);
      await store.update('orders', order.id, { status: 'cancelled' });
      res.status(502).json({ error: 'The payment service is unavailable right now. Please try again shortly.' });
    }
  });

  router.get('/orders/:token', async (req, res) => {
    const order = store.all('orders').find((item) => item.token === req.params.token);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // When the buyer comes back from Stripe, ask Stripe whether they paid.
    if (order.status === 'awaiting_payment' && payments && order.stripeSessionId) {
      try {
        const session = await payments.getCheckoutSession(order.stripeSessionId);
        if (session.payment_status === 'paid' && order.status === 'awaiting_payment') {
          await fulfillOrder({ store, mailer, currency: config.currency }, order, 'paid');
        }
      } catch (stripeError) {
        console.error('[stripe] Could not check payment:', stripeError.message);
      }
    }

    res.json(publicOrder(order, config.currency));
  });

  return router;
}
