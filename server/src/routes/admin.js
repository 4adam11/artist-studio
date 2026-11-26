import { Router } from 'express';
import { uniqueHandle } from '../catalog.js';
import { rateLimit } from '../middleware.js';
import { cancelOrder, orderNumber } from '../orders.js';
import { getSettings, saveSettings } from '../settings.js';
import { imageUpload, uploadUrl } from '../uploads.js';
import { collectionSchema, discountSchema, newVariantId, pageSchema, validate, validateProduct, validateSettings } from '../validate.js';

const newestFirst = (items) => [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
const now = () => new Date().toISOString();
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const toCsv = (rows) => `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
const round = (amount) => Math.round(amount * 100) / 100;

export function adminRoutes({ store, config, mailer, auth }) {
  const router = Router();
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please wait 15 minutes.' });

  router.post('/login', loginLimit, (req, res) => {
    if (!auth.enabled) {
      return res.status(503).json({ error: 'The admin is disabled. Set ADMIN_PASSWORD in server/.env to turn it on.' });
    }
    const session = auth.login(req.body?.password);
    if (!session) return res.status(401).json({ error: 'Incorrect password' });
    res.json(session);
  });

  router.use(auth.require);

  router.get('/session', (req, res) => {
    res.json({ ok: true });
  });

  const upload = imageUpload(config.dataDir, { maxFileSize: 10 * 1024 * 1024, maxFiles: 1 });
  router.post('/uploads', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image was uploaded' });
    res.status(201).json({ url: uploadUrl(req.file) });
  });

  const placedOrders = () => store.where('orders', (order) => order.status !== 'pending_payment');
  const withNumber = (order) => ({ ...order, number: orderNumber(order) });
  const notFound = (res) => res.status(404).json({ error: 'Not found' });

  // ---- Home ----

  router.get('/stats', (req, res) => {
    const days = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    const sales = placedOrders().filter((order) => order.status !== 'cancelled');
    const since = (iso) => sales.filter((order) => order.createdAt >= iso);
    const total = (orders) => round(orders.reduce((sum, order) => sum + order.total, 0));
    const last30 = since(days(30));

    const sold = new Map();
    for (const order of last30) {
      for (const item of order.items) {
        const entry = sold.get(item.productId) || { title: item.title, quantity: 0 };
        entry.quantity += item.quantity;
        sold.set(item.productId, entry);
      }
    }

    const lowStock = [];
    for (const product of store.where('products', (item) => item.status === 'active')) {
      for (const variant of product.variants) {
        if (variant.stock <= 2) lowStock.push({ productId: product.id, title: product.title, variant: variant.options.join(' / '), stock: variant.stock });
      }
    }

    res.json({
      today: { sales: total(since(days(1))), orders: since(days(1)).length },
      week: { sales: total(since(days(7))), orders: since(days(7)).length },
      month: { sales: total(last30), orders: last30.length },
      toFulfill: sales.filter((order) => order.fulfillmentStatus === 'unfulfilled').length,
      unpaid: sales.filter((order) => order.paymentStatus === 'unpaid').length,
      unreadMessages: store.where('messages', (message) => !message.read).length,
      lowStock: lowStock.sort((a, b) => a.stock - b.stock).slice(0, 8),
      topProducts: [...sold.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      recentOrders: newestFirst(placedOrders()).slice(0, 6).map((order) => ({
        id: order.id, number: orderNumber(order), customer: `${order.customer.firstName} ${order.customer.lastName}`,
        total: order.total, currency: order.currency, paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus, status: order.status, createdAt: order.createdAt
      }))
    });
  });

  // ---- Products ----

  router.get('/products', (req, res) => {
    res.json(newestFirst(store.all('products')));
  });

  router.get('/products/:id', (req, res) => {
    const product = store.find('products', req.params.id);
    if (!product) return notFound(res);
    res.json({ ...product, collectionIds: store.where('collections', (c) => c.productIds.includes(product.id)).map((c) => c.id) });
  });

  // Products can be added to collections straight from the product editor.
  async function setProductCollections(productId, collectionIds) {
    if (!Array.isArray(collectionIds)) return;
    for (const collection of store.all('collections')) {
      const wanted = collectionIds.includes(collection.id);
      const has = collection.productIds.includes(productId);
      if (wanted && !has) collection.productIds.push(productId);
      if (!wanted && has) collection.productIds = collection.productIds.filter((id) => id !== productId);
    }
    await store.save();
  }

  router.post('/products', async (req, res) => {
    const { value, error } = validateProduct(req.body);
    if (error) return res.status(400).json({ error });
    value.handle = uniqueHandle(store, 'products', value.handle || value.title);
    const product = await store.insert('products', { ...value, createdAt: now(), updatedAt: now() });
    await setProductCollections(product.id, req.body.collectionIds);
    res.status(201).json(product);
  });

  router.put('/products/:id', async (req, res) => {
    const existing = store.find('products', req.params.id);
    if (!existing) return notFound(res);
    const { value, error } = validateProduct(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    if (value.handle !== undefined) value.handle = uniqueHandle(store, 'products', value.handle || value.title || existing.title, existing.id);
    const product = await store.update('products', existing.id, { ...value, updatedAt: now() });
    await setProductCollections(product.id, req.body.collectionIds);
    res.json(product);
  });

  router.post('/products/:id/duplicate', async (req, res) => {
    const original = store.find('products', req.params.id);
    if (!original) return notFound(res);
    const { id, handle, createdAt, updatedAt, ...copy } = structuredClone(original);
    const title = `${original.title} (copy)`;
    const product = await store.insert('products', {
      ...copy,
      title,
      handle: uniqueHandle(store, 'products', title),
      status: 'draft',
      variants: copy.variants.map((variant) => ({ ...variant, id: newVariantId(), stock: 0 })),
      createdAt: now(),
      updatedAt: now()
    });
    res.status(201).json(product);
  });

  router.delete('/products/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!(await store.remove('products', id))) return notFound(res);
    for (const collection of store.all('collections')) collection.productIds = collection.productIds.filter((productId) => productId !== id);
    await store.save();
    res.status(204).end();
  });

  // ---- Collections & pages ----

  for (const [collection, schema] of [['collections', collectionSchema], ['pages', pageSchema]]) {
    router.get(`/${collection}`, (req, res) => res.json(store.all(collection)));

    router.get(`/${collection}/:id`, (req, res) => {
      const item = store.find(collection, req.params.id);
      return item ? res.json(item) : notFound(res);
    });

    router.post(`/${collection}`, async (req, res) => {
      const { value, error } = validate(req.body, schema);
      if (error) return res.status(400).json({ error });
      value.handle = uniqueHandle(store, collection, value.handle || value.title);
      res.status(201).json(await store.insert(collection, { ...value, createdAt: now() }));
    });

    router.put(`/${collection}/:id`, async (req, res) => {
      const existing = store.find(collection, req.params.id);
      if (!existing) return notFound(res);
      const { value, error } = validate(req.body, schema, { partial: true });
      if (error) return res.status(400).json({ error });
      if (value.handle !== undefined) value.handle = uniqueHandle(store, collection, value.handle || value.title || existing.title, existing.id);
      res.json(await store.update(collection, existing.id, { ...value, updatedAt: now() }));
    });

    router.delete(`/${collection}/:id`, async (req, res) => {
      if (!(await store.remove(collection, req.params.id))) return notFound(res);
      res.status(204).end();
    });
  }

  // ---- Discounts ----

  router.get('/discounts', (req, res) => res.json(newestFirst(store.all('discounts'))));

  const codeTaken = (code, id) => store.all('discounts').some((item) => item.code === code && item.id !== Number(id));

  router.post('/discounts', async (req, res) => {
    const { value, error } = validate(req.body, discountSchema);
    if (error) return res.status(400).json({ error });
    if (codeTaken(value.code)) return res.status(400).json({ error: `The code ${value.code} already exists` });
    if (value.type !== 'shipping' && !(value.amount > 0)) return res.status(400).json({ error: 'Enter an amount above 0' });
    res.status(201).json(await store.insert('discounts', { ...value, uses: 0, createdAt: now() }));
  });

  router.put('/discounts/:id', async (req, res) => {
    const { value, error } = validate(req.body, discountSchema, { partial: true });
    if (error) return res.status(400).json({ error });
    if (value.code && codeTaken(value.code, req.params.id)) return res.status(400).json({ error: `The code ${value.code} already exists` });
    const discount = await store.update('discounts', req.params.id, value);
    return discount ? res.json(discount) : notFound(res);
  });

  router.delete('/discounts/:id', async (req, res) => {
    if (!(await store.remove('discounts', req.params.id))) return notFound(res);
    res.status(204).end();
  });

  // ---- Orders ----

  router.get('/orders', (req, res) => {
    res.json(newestFirst(placedOrders()).map(withNumber));
  });

  router.get('/orders/:id', (req, res) => {
    const order = store.find('orders', req.params.id);
    if (!order || order.status === 'pending_payment') return notFound(res);
    res.json(withNumber(order));
  });

  const openOrder = (req, res) => {
    const order = store.find('orders', req.params.id);
    if (!order || order.status === 'pending_payment') return notFound(res);
    if (order.status === 'cancelled') return res.status(400).json({ error: 'This order is cancelled' });
    return order;
  };

  router.post('/orders/:id/mark-paid', async (req, res) => {
    const order = openOrder(req, res);
    if (!order) return;
    await store.update('orders', order.id, { paymentStatus: 'paid', paidAt: now() });
    res.json(withNumber(order));
  });

  router.post('/orders/:id/fulfill', async (req, res) => {
    const order = openOrder(req, res);
    if (!order) return;
    const { value, error } = validate(req.body, {
      trackingNumber: { type: 'string', max: 100, default: '', label: 'Tracking number' },
      trackingUrl: { type: 'url', max: 500, default: '', label: 'Tracking link' },
      notify: { type: 'boolean', default: true }
    });
    if (error) return res.status(400).json({ error });
    const wasFulfilled = order.fulfillmentStatus === 'fulfilled';
    await store.update('orders', order.id, {
      fulfillmentStatus: 'fulfilled',
      trackingNumber: value.trackingNumber,
      trackingUrl: value.trackingUrl,
      fulfilledAt: order.fulfilledAt || now()
    });
    if (value.notify && !wasFulfilled) await mailer.orderShipped(order);
    res.json(withNumber(order));
  });

  router.post('/orders/:id/cancel', async (req, res) => {
    const order = openOrder(req, res);
    if (!order) return;
    await cancelOrder(store, order, { restock: req.body?.restock !== false });
    res.json(withNumber(order));
  });

  router.patch('/orders/:id', async (req, res) => {
    const { value, error } = validate(req.body, { staffNote: { type: 'string', max: 5000, required: true, label: 'Note' } });
    if (error) return res.status(400).json({ error });
    const order = await store.update('orders', req.params.id, value);
    return order ? res.json(withNumber(order)) : notFound(res);
  });

  // ---- Customers (built from orders) ----

  function customers() {
    const byEmail = new Map();
    for (const order of newestFirst(placedOrders())) {
      const email = order.customer.email;
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          email,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          phone: order.customer.phone,
          location: [order.shippingAddress.city, order.shippingAddress.country].filter(Boolean).join(', '),
          orders: 0,
          spent: 0,
          lastOrderAt: order.createdAt,
          orderIds: []
        });
      }
      const customer = byEmail.get(email);
      customer.orders += 1;
      customer.orderIds.push(order.id);
      if (order.status !== 'cancelled') customer.spent = round(customer.spent + order.total);
    }
    const subscribed = new Set(store.all('subscribers').map((subscriber) => subscriber.email));
    return [...byEmail.values()].map((customer) => ({ ...customer, subscribed: subscribed.has(customer.email) }));
  }

  router.get('/customers', (req, res) => res.json(customers()));

  router.get('/customers.csv', (req, res) => {
    const rows = [['name', 'email', 'phone', 'location', 'orders', 'total_spent', 'last_order', 'subscribed'],
      ...customers().map((c) => [c.name, c.email, c.phone, c.location, c.orders, c.spent, c.lastOrderAt, c.subscribed ? 'yes' : 'no'])];
    res.type('text/csv').attachment('customers.csv').send(toCsv(rows));
  });

  // ---- Messages & subscribers ----

  router.get('/messages', (req, res) => res.json(newestFirst(store.all('messages'))));

  router.patch('/messages/:id', async (req, res) => {
    const { value, error } = validate(req.body, { read: { type: 'boolean', required: true } });
    if (error) return res.status(400).json({ error });
    const message = await store.update('messages', req.params.id, value);
    return message ? res.json(message) : notFound(res);
  });

  router.get('/subscribers', (req, res) => res.json(newestFirst(store.all('subscribers'))));

  // Includes a personal unsubscribe link to put in each newsletter email.
  router.get('/subscribers.csv', (req, res) => {
    const rows = [['email', 'source', 'subscribed_at', 'unsubscribe_url'],
      ...newestFirst(store.all('subscribers')).map((s) => [s.email, s.source, s.createdAt, `${config.publicUrl}/unsubscribe/${s.token}`])];
    res.type('text/csv').attachment('subscribers.csv').send(toCsv(rows));
  });

  for (const collection of ['messages', 'subscribers']) {
    router.delete(`/${collection}/:id`, async (req, res) => {
      if (!(await store.remove(collection, req.params.id))) return notFound(res);
      res.status(204).end();
    });
  }

  // ---- Settings ----

  router.get('/settings', (req, res) => res.json(getSettings(store, config)));

  router.put('/settings', async (req, res) => {
    const { value, error } = validateSettings(req.body);
    if (error) return res.status(400).json({ error });
    res.json(await saveSettings(store, config, value));
  });

  return router;
}
