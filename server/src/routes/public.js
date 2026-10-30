import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { isSpam, rateLimit } from '../middleware.js';
import { CONFIRMED_STATUSES, fulfillOrder, newOrder, priceOrder, publicOrder } from '../orders.js';
import { getSettings } from '../settings.js';
import { discardUploads, imageUpload, uploadUrl } from '../uploads.js';
import { checkoutSchema, commentSchema, commissionSchema, contactSchema, emailSchema, reviewSchema, validate } from '../validate.js';

const TEN_MINUTES = 10 * 60 * 1000;
const now = () => new Date().toISOString();
const newestFirst = (items) => [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

const publicComment = ({ id, name, message, createdAt }) => ({ id, name, message, createdAt });
const publicReview = ({ id, name, rating, title, body, verified, createdAt }) => ({ id, name, rating, title, body, verified, createdAt });

export function publicRoutes({ store, config, mailer, payments }) {
  const router = Router();
  const formLimit = rateLimit({ windowMs: TEN_MINUTES, max: 10 });
  const checkoutLimit = rateLimit({ windowMs: TEN_MINUTES, max: 40 });
  const commissionUpload = imageUpload(config.dataDir, { maxFileSize: 6 * 1024 * 1024, maxFiles: 3, prefix: 'ref-' });

  const approvedReviews = (productId) => store.where('reviews', (review) => review.productId === productId && review.approved);
  const withRating = (product) => {
    const reviews = approvedReviews(product.id);
    const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
    return { ...product, gallery: product.gallery || [], rating: { average: Math.round(average * 10) / 10, count: reviews.length } };
  };
  const findProduct = (req, res) => {
    const product = store.find('products', req.params.id);
    if (!product) res.status(404).json({ error: 'Product not found' });
    return product;
  };

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/config', (req, res) => {
    res.json({ currency: config.currency, onlinePayments: Boolean(payments), settings: getSettings(store) });
  });

  // ---- Portfolio ----

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
    if (isSpam(req.body)) return res.status(201).json({ id: 0, ...value, createdAt: now() });

    const comment = await store.insert('comments', { artworkId: artwork.id, ...value, createdAt: now() });
    res.status(201).json(publicComment(comment));
  });

  // ---- Shop ----

  router.get('/products', (req, res) => {
    res.json(store.all('products').map(withRating));
  });

  router.get('/products/:id', (req, res) => {
    const product = findProduct(req, res);
    if (product) res.json(withRating(product));
  });

  router.get('/products/:id/reviews', (req, res) => {
    const product = findProduct(req, res);
    if (product) res.json(newestFirst(approvedReviews(product.id)).map(publicReview));
  });

  // Reviews are held for the artist to approve before they appear. A review
  // is marked "verified" when the email matches someone who bought the item.
  router.post('/products/:id/reviews', formLimit, async (req, res) => {
    const product = findProduct(req, res);
    if (!product) return;
    const { value, error } = validate(req.body, reviewSchema);
    if (error) return res.status(400).json({ error });
    if (isSpam(req.body)) return res.status(201).json({ ok: true });

    const email = value.email.toLowerCase();
    const verified = store.all('orders').some((order) =>
      order.email.toLowerCase() === email &&
      CONFIRMED_STATUSES.includes(order.status) &&
      order.items.some((item) => item.productId === product.id));
    await store.insert('reviews', { productId: product.id, ...value, email, verified, approved: false, createdAt: now() });
    res.status(201).json({ ok: true });
  });

  router.post('/products/:id/notify', formLimit, async (req, res) => {
    const product = findProduct(req, res);
    if (!product) return;
    const { value, error } = validate(req.body, emailSchema);
    if (error) return res.status(400).json({ error });

    const email = value.email.toLowerCase();
    const waiting = store.all('stockAlerts').some((alert) => alert.productId === product.id && alert.email === email && !alert.notifiedAt);
    if (!waiting && !isSpam(req.body)) {
      await store.insert('stockAlerts', { productId: product.id, email, notifiedAt: null, createdAt: now() });
    }
    res.status(201).json({ ok: true });
  });

  // ---- Journal & events ----

  router.get('/posts', (req, res) => {
    res.json(newestFirst(store.where('posts', (post) => post.published)));
  });

  router.get('/posts/:id', (req, res) => {
    const post = store.find('posts', req.params.id);
    if (!post || !post.published) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  router.get('/events', (req, res) => {
    res.json([...store.all('events')].sort((a, b) => a.date.localeCompare(b.date)));
  });

  // ---- Messages, commissions, newsletter ----

  router.post('/contact', formLimit, async (req, res) => {
    const { value, error } = validate(req.body, contactSchema);
    if (error) return res.status(400).json({ error });
    if (isSpam(req.body)) return res.json({ ok: true });

    const message = await store.insert('messages', { ...value, read: false, createdAt: now() });
    await mailer.contactReceived(message);
    res.json({ ok: true });
  });

  router.post('/commissions', formLimit, commissionUpload.array('references', 3), async (req, res) => {
    const { value, error } = validate(req.body, commissionSchema);
    if (error || isSpam(req.body)) {
      await discardUploads(req.files);
      return error ? res.status(400).json({ error }) : res.status(201).json({ ok: true });
    }

    const request = await store.insert('commissions', {
      ...value,
      references: (req.files || []).map(uploadUrl),
      status: 'new',
      note: '',
      createdAt: now()
    });
    await mailer.commissionReceived(request);
    await mailer.commissionAcknowledged(request);
    res.status(201).json({ ok: true });
  });

  router.post('/subscribe', formLimit, async (req, res) => {
    const { value, error } = validate(req.body, emailSchema);
    if (error) return res.status(400).json({ error });

    const email = value.email.toLowerCase();
    const exists = store.all('subscribers').some((subscriber) => subscriber.email === email);
    if (!exists && !isSpam(req.body)) {
      const source = typeof req.body.source === 'string' ? req.body.source.slice(0, 40) : '';
      await store.insert('subscribers', { email, token: randomUUID(), source, createdAt: now() });
    }
    // Same answer either way, so the form can't be used to check who is subscribed.
    res.status(201).json({ ok: true });
  });

  router.post('/unsubscribe', async (req, res) => {
    const token = String(req.body?.token || '');
    await store.removeWhere('subscribers', (subscriber) => subscriber.token === token);
    res.json({ ok: true });
  });

  // ---- Checkout ----

  router.post('/checkout/quote', checkoutLimit, (req, res) => {
    const quote = priceOrder(store, req.body?.items, req.body?.discountCode);
    if (quote.error) return res.status(400).json({ error: quote.error });
    res.json(quote);
  });

  router.post('/checkout', checkoutLimit, async (req, res) => {
    const { value, error } = validate(req.body, checkoutSchema);
    if (error) return res.status(400).json({ error });

    const quote = priceOrder(store, req.body.items, value.discountCode);
    if (quote.error || quote.discountError) return res.status(400).json({ error: quote.error || quote.discountError });

    const { name, email, phone, note, line1, line2, city, region, postalCode, country } = value;
    const order = await store.insert('orders', newOrder({
      name, email, phone, note,
      address: { line1, line2, city, region, postalCode, country },
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      shipping: quote.shipping,
      total: quote.total,
      status: 'awaiting_payment'
    }));

    // Without Stripe the order is accepted right away and paid by invoice.
    if (!payments) {
      await fulfillOrder({ store, mailer }, order, 'received');
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
          await fulfillOrder({ store, mailer }, order, 'paid');
        }
      } catch (stripeError) {
        console.error('[stripe] Could not check payment:', stripeError.message);
      }
    }

    res.json(publicOrder(order, config.currency));
  });

  return router;
}
