import path from 'node:path';
import { Router } from 'express';
import { rateLimit } from '../middleware.js';
import { CONFIRMED_STATUSES, ORDER_STATUSES } from '../orders.js';
import { getSettings, saveSettings } from '../settings.js';
import { discardUploads, imageUpload, uploadUrl } from '../uploads.js';
import { artworkSchema, discountSchema, eventSchema, postSchema, productSchema, settingsSchema, validate } from '../validate.js';

export const COMMISSION_STATUSES = ['new', 'quoted', 'accepted', 'in_progress', 'completed', 'declined'];

const newestFirst = (items) => [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
const now = () => new Date().toISOString();
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Content the artist creates and edits with the same add/edit/delete screens.
const CONTENT = {
  artworks: artworkSchema,
  products: productSchema,
  posts: postSchema,
  events: eventSchema,
  discounts: discountSchema
};

export function adminRoutes({ store, config, mailer, auth }) {
  const router = Router();
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please wait 15 minutes.' });

  router.post('/login', loginLimit, (req, res) => {
    if (!auth.enabled) {
      return res.status(503).json({ error: 'The admin area is disabled. Set ADMIN_PASSWORD in server/.env to turn it on.' });
    }
    const session = auth.login(req.body?.password);
    if (!session) return res.status(401).json({ error: 'Incorrect admin password' });
    res.json(session);
  });

  router.use(auth.require);

  router.get('/session', (req, res) => {
    res.json({ ok: true });
  });

  const upload = imageUpload(config.dataDir, { maxFileSize: 8 * 1024 * 1024, maxFiles: 1 });
  router.post('/uploads', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image was uploaded' });
    res.status(201).json({ url: uploadUrl(req.file) });
  });

  // ---- Overview ----

  router.get('/stats', (req, res) => {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const confirmed = store.where('orders', (order) => CONFIRMED_STATUSES.includes(order.status));
    const thisMonth = confirmed.filter((order) => order.createdAt >= monthStart.toISOString());

    res.json({
      revenueThisMonth: Math.round(thisMonth.reduce((sum, order) => sum + order.total, 0) * 100) / 100,
      ordersThisMonth: thisMonth.length,
      revenueAllTime: Math.round(confirmed.reduce((sum, order) => sum + order.total, 0) * 100) / 100,
      ordersToShip: store.where('orders', (order) => ['paid', 'received'].includes(order.status)).length,
      unreadMessages: store.where('messages', (message) => !message.read).length,
      newCommissions: store.where('commissions', (request) => request.status === 'new').length,
      pendingReviews: store.where('reviews', (review) => !review.approved).length,
      subscribers: store.all('subscribers').length,
      waitingForStock: store.where('stockAlerts', (alert) => !alert.notifiedAt).length,
      lowStock: store.where('products', (product) => product.stock <= 1).map(({ id, title, stock }) => ({ id, title, stock })),
      recentOrders: newestFirst(store.all('orders')).slice(0, 5).map(({ id, name, total, status, createdAt }) => ({ id, name, total, status, createdAt }))
    });
  });

  // ---- Content: list / create / update / delete ----

  async function checkDiscountCode(value, id) {
    if (!value.code) return null;
    const clash = store.all('discounts').some((item) => item.code === value.code && item.id !== Number(id));
    return clash ? `The code ${value.code} already exists` : null;
  }

  // When a sold-out product gets stock again, email everyone who asked.
  async function sendBackInStockAlerts(product) {
    const alerts = store.where('stockAlerts', (alert) => alert.productId === product.id && !alert.notifiedAt);
    for (const alert of alerts) {
      await mailer.backInStock(alert, product);
      alert.notifiedAt = now();
    }
    if (alerts.length) await store.save();
  }

  for (const [collection, schema] of Object.entries(CONTENT)) {
    router.get(`/${collection}`, (req, res) => {
      res.json(collection === 'events' ? store.all(collection) : newestFirst(store.all(collection)));
    });

    router.post(`/${collection}`, async (req, res) => {
      const { value, error } = validate(req.body, schema);
      if (error) return res.status(400).json({ error });
      if (collection === 'discounts') {
        const clash = await checkDiscountCode(value);
        if (clash) return res.status(400).json({ error: clash });
        value.uses = 0;
      }
      res.status(201).json(await store.insert(collection, { ...value, createdAt: now() }));
    });

    router.put(`/${collection}/:id`, async (req, res) => {
      const { value, error } = validate(req.body, schema, { partial: true });
      if (error) return res.status(400).json({ error });
      if (collection === 'discounts') {
        const clash = await checkDiscountCode(value, req.params.id);
        if (clash) return res.status(400).json({ error: clash });
      }

      const before = store.find(collection, req.params.id);
      if (!before) return res.status(404).json({ error: 'Not found' });
      const wasSoldOut = collection === 'products' && before.stock < 1;
      const item = await store.update(collection, req.params.id, { ...value, updatedAt: now() });
      if (wasSoldOut && item.stock > 0) await sendBackInStockAlerts(item);
      res.json(item);
    });

    router.delete(`/${collection}/:id`, async (req, res) => {
      const removed = await store.remove(collection, req.params.id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      const id = Number(req.params.id);
      if (collection === 'artworks') await store.removeWhere('comments', (comment) => comment.artworkId === id);
      if (collection === 'products') {
        await store.removeWhere('reviews', (review) => review.productId === id);
        await store.removeWhere('stockAlerts', (alert) => alert.productId === id);
      }
      res.status(204).end();
    });
  }

  // ---- Settings ----

  router.get('/settings', (req, res) => {
    res.json(getSettings(store));
  });

  router.put('/settings', async (req, res) => {
    const { value, error } = validate(req.body, settingsSchema, { partial: true });
    if (error) return res.status(400).json({ error });
    res.json(await saveSettings(store, value));
  });

  // ---- Orders ----

  router.get('/orders', (req, res) => {
    res.json(newestFirst(store.all('orders')));
  });

  router.patch('/orders/:id', async (req, res) => {
    const order = store.find('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const { status, trackingNumber } = req.body || {};
    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    if (trackingNumber !== undefined && (typeof trackingNumber !== 'string' || trackingNumber.length > 100)) {
      return res.status(400).json({ error: 'Tracking number must be text of at most 100 characters' });
    }

    const justShipped = status === 'shipped' && order.status !== 'shipped';
    await store.update('orders', order.id, {
      ...(status !== undefined && { status }),
      ...(trackingNumber !== undefined && { trackingNumber: trackingNumber.trim() }),
      ...(justShipped && { shippedAt: now() })
    });
    if (justShipped) await mailer.orderShipped(order);
    res.json(order);
  });

  // ---- Commissions ----

  router.get('/commissions', (req, res) => {
    res.json(newestFirst(store.all('commissions')));
  });

  router.patch('/commissions/:id', async (req, res) => {
    const { status, note } = req.body || {};
    if (status !== undefined && !COMMISSION_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${COMMISSION_STATUSES.join(', ')}` });
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 5000)) {
      return res.status(400).json({ error: 'Notes must be text of at most 5000 characters' });
    }
    const request = await store.update('commissions', req.params.id, {
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note })
    });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  });

  router.delete('/commissions/:id', async (req, res) => {
    const request = store.find('commissions', req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    await store.remove('commissions', request.id);
    const uploadsDir = path.join(config.dataDir, 'uploads');
    await discardUploads(request.references.map((url) => ({ path: path.join(uploadsDir, path.basename(url)) })));
    res.status(204).end();
  });

  // ---- Reviews & comments ----

  router.get('/reviews', (req, res) => {
    res.json(newestFirst(store.all('reviews')).map((review) => ({
      ...review,
      productTitle: store.find('products', review.productId)?.title || 'Deleted product'
    })));
  });

  router.patch('/reviews/:id', async (req, res) => {
    const { value, error } = validate(req.body, { approved: { type: 'boolean', required: true } });
    if (error) return res.status(400).json({ error });
    const review = await store.update('reviews', req.params.id, value);
    if (!review) return res.status(404).json({ error: 'Not found' });
    res.json(review);
  });

  router.get('/comments', (req, res) => {
    res.json(newestFirst(store.all('comments')).map((comment) => ({
      ...comment,
      artworkTitle: store.find('artworks', comment.artworkId)?.title || 'Deleted artwork'
    })));
  });

  // ---- Messages ----

  router.get('/messages', (req, res) => {
    res.json(newestFirst(store.all('messages')));
  });

  router.patch('/messages/:id', async (req, res) => {
    const { value, error } = validate(req.body, { read: { type: 'boolean', required: true } });
    if (error) return res.status(400).json({ error });
    const message = await store.update('messages', req.params.id, value);
    if (!message) return res.status(404).json({ error: 'Not found' });
    res.json(message);
  });

  // ---- Newsletter & stock alerts ----

  router.get('/subscribers', (req, res) => {
    res.json(newestFirst(store.all('subscribers')));
  });

  router.get('/subscribers.csv', (req, res) => {
    // Includes a personal unsubscribe link to paste into each newsletter email.
    const rows = [
      ['email', 'source', 'subscribed_at', 'unsubscribe_url'],
      ...newestFirst(store.all('subscribers')).map((s) => [s.email, s.source, s.createdAt, `${config.publicUrl}/unsubscribe/${s.token}`])
    ];
    res.type('text/csv').attachment('subscribers.csv').send(`${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
  });

  router.get('/stockAlerts', (req, res) => {
    res.json(newestFirst(store.all('stockAlerts')).map((alert) => ({
      ...alert,
      productTitle: store.find('products', alert.productId)?.title || 'Deleted product'
    })));
  });

  // Simple deletes for records that have no extra clean-up.
  for (const collection of ['comments', 'messages', 'reviews', 'subscribers', 'stockAlerts']) {
    router.delete(`/${collection}/:id`, async (req, res) => {
      if (!(await store.remove(collection, req.params.id))) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    });
  }

  return router;
}
