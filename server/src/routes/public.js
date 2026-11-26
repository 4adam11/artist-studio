import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { findByHandle, isListed, publicProduct } from '../catalog.js';
import { isSpam, rateLimit } from '../middleware.js';
import { confirmOrder, newOrder, orderNumber, priceOrder, publicOrder } from '../orders.js';
import { getSettings } from '../settings.js';
import { CONTACT_SUBJECTS, checkoutSchema, contactSchema, emailSchema, validate } from '../validate.js';

const TEN_MINUTES = 10 * 60 * 1000;
const now = () => new Date().toISOString();

export function publicRoutes({ store, config, mailer, payments }) {
  const router = Router();
  const formLimit = rateLimit({ windowMs: TEN_MINUTES, max: 10 });
  const checkoutLimit = rateLimit({ windowMs: TEN_MINUTES, max: 60 });
  const lookupLimit = rateLimit({ windowMs: TEN_MINUTES, max: 10, message: 'Too many attempts. Please wait a few minutes and try again.' });

  const listedProducts = () => store.where('products', isListed);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Everything the storefront needs on first load, in one request.
  router.get('/storefront', (req, res) => {
    const settings = getSettings(store, config);
    const listedIds = new Set(listedProducts().map((product) => product.id));
    res.json({
      settings: {
        storeName: settings.storeName,
        tagline: settings.tagline,
        announcement: settings.announcement,
        currency: settings.currency,
        taxRate: settings.taxRate,
        contactEmail: settings.contactEmail,
        social: Object.fromEntries(['instagram', 'facebook', 'pinterest', 'tiktok'].map((key) => [key, settings[key]]).filter(([, url]) => url)),
        shippingRates: settings.shippingRates.map(({ id, name, price, freeOver }) => ({ id, name, price, freeOver })),
        featuredCollectionId: settings.featuredCollectionId,
        onlinePayments: Boolean(payments),
        contactSubjects: CONTACT_SUBJECTS
      },
      products: listedProducts().map(publicProduct),
      collections: store.all('collections').map(({ id, title, handle, description, image, productIds }) => ({
        id, title, handle, description, image, productIds: productIds.filter((productId) => listedIds.has(productId))
      })),
      pages: store.where('pages', (page) => page.published).map(({ title, handle }) => ({ title, handle }))
    });
  });

  router.get('/products/:handle', (req, res) => {
    const product = findByHandle(store, 'products', req.params.handle);
    if (!product || !isListed(product)) return res.status(404).json({ error: 'Product not found' });
    res.json(publicProduct(product));
  });

  router.get('/pages/:handle', (req, res) => {
    const page = findByHandle(store, 'pages', req.params.handle);
    if (!page || !page.published) return res.status(404).json({ error: 'Page not found' });
    res.json({ title: page.title, handle: page.handle, body: page.body });
  });

  // ---- Forms ----

  router.post('/contact', formLimit, async (req, res) => {
    const { value, error } = validate(req.body, contactSchema);
    if (error) return res.status(400).json({ error });
    if (isSpam(req.body)) return res.json({ ok: true });

    const message = await store.insert('messages', { ...value, read: false, createdAt: now() });
    await mailer.contactReceived(message);
    res.json({ ok: true });
  });

  async function subscribe(email, source) {
    const normalized = email.toLowerCase();
    if (store.all('subscribers').some((subscriber) => subscriber.email === normalized)) return;
    await store.insert('subscribers', { email: normalized, token: randomUUID(), source, createdAt: now() });
  }

  router.post('/subscribe', formLimit, async (req, res) => {
    const { value, error } = validate(req.body, emailSchema);
    if (error) return res.status(400).json({ error });
    if (!isSpam(req.body)) await subscribe(value.email, typeof req.body.source === 'string' ? req.body.source.slice(0, 40) : '');
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
    const quote = priceOrder(store, config, {
      items: req.body?.items,
      discountCode: req.body?.discountCode,
      shippingRateId: req.body?.shippingRateId
    });
    if (quote.error) return res.status(400).json({ error: quote.error });
    res.json(quote);
  });

  router.post('/checkout', checkoutLimit, async (req, res) => {
    const { value, error } = validate(req.body, checkoutSchema);
    if (error) return res.status(400).json({ error });

    const quote = priceOrder(store, config, { items: req.body.items, discountCode: value.discountCode, shippingRateId: value.shippingRateId });
    if (quote.error || quote.discountError) return res.status(400).json({ error: quote.error || quote.discountError });

    const { email, firstName, lastName, phone, line1, line2, city, region, postalCode, country, note } = value;
    const order = await store.insert('orders', newOrder({
      status: payments ? 'pending_payment' : 'open',
      customer: { email: email.toLowerCase(), firstName, lastName, phone },
      shippingAddress: { line1, line2, city, region, postalCode, country },
      note,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      shipping: quote.shipping,
      tax: quote.tax,
      total: quote.total,
      currency: quote.currency
    }));
    if (value.subscribe) await subscribe(email, 'checkout');

    // Without Stripe the order is placed right away and paid by invoice.
    if (!payments) {
      await confirmOrder({ store, mailer }, order, { paid: false });
      return res.status(201).json({ token: order.token });
    }

    try {
      const session = await payments.createCheckoutSession(order);
      await store.update('orders', order.id, { stripeSessionId: session.id });
      res.status(201).json({ token: order.token, paymentUrl: session.url });
    } catch (stripeError) {
      console.error('[stripe] Could not start checkout:', stripeError.message);
      await store.remove('orders', order.id);
      res.status(502).json({ error: 'The payment service is unavailable right now. Please try again shortly.' });
    }
  });

  router.get('/orders/:token', async (req, res) => {
    const order = store.all('orders').find((item) => item.token === req.params.token);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // When the buyer comes back from Stripe, ask Stripe whether they paid.
    if (order.status === 'pending_payment' && payments && order.stripeSessionId) {
      try {
        const session = await payments.getCheckoutSession(order.stripeSessionId);
        if (session.payment_status === 'paid' && order.status === 'pending_payment') {
          await confirmOrder({ store, mailer }, order, { paid: true });
        }
      } catch (stripeError) {
        console.error('[stripe] Could not check payment:', stripeError.message);
      }
    }

    res.json(publicOrder(order));
  });

  // "Where's my order?": find an order from its number and the email used.
  router.post('/orders/lookup', lookupLimit, (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const number = Number(String(req.body?.number || '').replace(/\D/g, ''));
    const order = store.all('orders').find((item) => orderNumber(item) === number && item.customer.email === email && item.status !== 'pending_payment');
    if (!order) return res.status(404).json({ error: 'We could not find an order with that number and email.' });
    res.json({ token: order.token });
  });

  return router;
}
