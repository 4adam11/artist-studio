import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { seed } from '../src/seed.js';
import { createStore } from '../src/store.js';

const ADMIN_PASSWORD = 'test-password';
const tempDirs = [];

const mailer = { enabled: false, sent: [], contactReceived(m) { this.sent.push(['contact', m]); }, orderPlaced(o) { this.sent.push(['order', o]); } };

async function startServer({ payments = null, adminPassword = ADMIN_PASSWORD } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'artist-studio-'));
  tempDirs.push(dataDir);
  const config = { ...loadConfig({}), dataDir, adminPassword, clientDist: path.join(dataDir, 'no-client') };
  const store = await createStore({ dataDir, seed });
  const app = createApp({ store, config, mailer, payments });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, url, { body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return { server, store, dataDir, call, close: () => new Promise((resolve) => server.close(resolve)) };
}

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('public API', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('lists artworks and products from the seed data', async () => {
    const artworks = await ctx.call('GET', '/api/artworks');
    const products = await ctx.call('GET', '/api/products');
    assert.equal(artworks.status, 200);
    assert.equal(artworks.body.length, seed.artworks.length);
    assert.equal(products.body[0].stock, seed.products[0].stock);
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await ctx.call('GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Not found');
  });

  test('reports whether online payments are enabled', async () => {
    const res = await ctx.call('GET', '/api/config');
    assert.deepEqual(res.body, { currency: 'usd', onlinePayments: false });
  });

  test('comments are validated and saved to disk', async () => {
    assert.equal((await ctx.call('POST', '/api/artworks/1/comments', { body: { name: 'A' } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/artworks/999/comments', { body: { name: 'A', message: 'Hi' } })).status, 404);
    assert.equal((await ctx.call('POST', '/api/artworks/1/comments', { body: { name: 'A', message: 'x'.repeat(1001) } })).status, 400);

    const created = await ctx.call('POST', '/api/artworks/1/comments', { body: { name: '  Mina ', message: 'Lovely' } });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, 'Mina');

    const list = await ctx.call('GET', '/api/artworks/1/comments');
    assert.ok(list.body.some((comment) => comment.message === 'Lovely'));

    const onDisk = JSON.parse(await readFile(path.join(ctx.dataDir, 'db.json'), 'utf8'));
    assert.ok(onDisk.comments.some((comment) => comment.message === 'Lovely'));
  });

  test('contact messages are validated, stored and ignore honeypot spam', async () => {
    assert.equal((await ctx.call('POST', '/api/contact', { body: { name: 'B', email: 'not-an-email', message: 'Hi' } })).status, 400);

    const ok = await ctx.call('POST', '/api/contact', { body: { name: 'B', email: 'b@example.com', message: 'Commission?' } });
    assert.equal(ok.status, 200);
    const spam = await ctx.call('POST', '/api/contact', { body: { name: 'Bot', email: 'bot@example.com', message: 'Buy', website: 'x' } });
    assert.equal(spam.status, 200);

    const messages = ctx.store.all('messages');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].message, 'Commission?');
  });

  test('checkout uses server prices, checks stock and reduces it', async () => {
    const customer = { name: 'C', email: 'c@example.com' };

    const empty = await ctx.call('POST', '/api/checkout', { body: { ...customer, items: [] } });
    assert.equal(empty.status, 400);

    const tooMany = await ctx.call('POST', '/api/checkout', { body: { ...customer, items: [{ productId: 2, quantity: 99 }] } });
    assert.equal(tooMany.status, 400);
    assert.match(tooMany.body.error, /Only 3/);

    const order = await ctx.call('POST', '/api/checkout', {
      body: { ...customer, items: [{ productId: 1, quantity: 2, price: 0.01 }, { productId: 2, quantity: 1 }] }
    });
    assert.equal(order.status, 201);
    assert.equal(order.body.paymentUrl, undefined);

    const details = await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(details.body.status, 'received');
    assert.equal(details.body.total, 28 * 2 + 24);
    assert.equal(details.body.email, undefined, 'buyer email is not exposed publicly');

    assert.equal(ctx.store.find('products', 1).stock, 3);
    assert.equal(ctx.store.find('products', 2).stock, 2);
  });

  test('unknown order tokens return 404', async () => {
    assert.equal((await ctx.call('GET', '/api/orders/not-a-token')).status, 404);
  });
});

describe('admin API', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('rejects missing or wrong passwords', async () => {
    assert.equal((await ctx.call('GET', '/api/admin/session')).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: 'wrong' })).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: ADMIN_PASSWORD })).status, 200);
  });

  test('creates, updates and deletes products', async () => {
    const token = ADMIN_PASSWORD;
    const invalid = await ctx.call('POST', '/api/admin/products', { token, body: { title: 'No price' } });
    assert.equal(invalid.status, 400);

    const created = await ctx.call('POST', '/api/admin/products', {
      token,
      body: { title: 'Scarf', category: 'Crochet', description: 'Warm', price: 40, stock: 1, image: '/uploads/scarf.jpg' }
    });
    assert.equal(created.status, 201);

    const updated = await ctx.call('PUT', `/api/admin/products/${created.body.id}`, { token, body: { price: 45 } });
    assert.equal(updated.body.price, 45);
    assert.equal(updated.body.title, 'Scarf');

    assert.equal((await ctx.call('DELETE', `/api/admin/products/${created.body.id}`, { token })).status, 204);
    assert.equal((await ctx.call('GET', `/api/products/${created.body.id}`)).status, 404);
  });

  test('deleting an artwork also deletes its comments', async () => {
    await ctx.call('DELETE', '/api/admin/artworks/1', { token: ADMIN_PASSWORD });
    assert.equal(ctx.store.where('comments', (comment) => comment.artworkId === 1).length, 0);
  });

  test('updates order status', async () => {
    const order = await ctx.call('POST', '/api/checkout', { body: { name: 'D', email: 'd@example.com', items: [{ productId: 1, quantity: 1 }] } });
    const [stored] = ctx.store.where('orders', (item) => item.token === order.body.token);
    const bad = await ctx.call('PATCH', `/api/admin/orders/${stored.id}`, { token: ADMIN_PASSWORD, body: { status: 'lost' } });
    assert.equal(bad.status, 400);
    const shipped = await ctx.call('PATCH', `/api/admin/orders/${stored.id}`, { token: ADMIN_PASSWORD, body: { status: 'shipped' } });
    assert.equal(shipped.body.status, 'shipped');
  });
});

describe('admin disabled', () => {
  test('returns 503 when no ADMIN_PASSWORD is set', async () => {
    const ctx = await startServer({ adminPassword: '' });
    const res = await ctx.call('GET', '/api/admin/session', { token: 'anything' });
    assert.equal(res.status, 503);
    await ctx.close();
  });
});

describe('Stripe checkout', () => {
  let ctx;
  let paid;
  const payments = {
    createCheckoutSession: async (order) => ({ id: `cs_${order.id}`, url: 'https://checkout.stripe.test/pay' }),
    getCheckoutSession: async () => ({ payment_status: paid ? 'paid' : 'unpaid' })
  };

  before(async () => { ctx = await startServer({ payments }); });
  after(() => ctx.close());
  beforeEach(() => { paid = false; });

  test('only takes stock once Stripe reports the order as paid', async () => {
    const order = await ctx.call('POST', '/api/checkout', { body: { name: 'E', email: 'e@example.com', items: [{ productId: 2, quantity: 1 }] } });
    assert.equal(order.body.paymentUrl, 'https://checkout.stripe.test/pay');
    assert.equal(ctx.store.find('products', 2).stock, 3);

    assert.equal((await ctx.call('GET', `/api/orders/${order.body.token}`)).body.status, 'awaiting_payment');

    paid = true;
    assert.equal((await ctx.call('GET', `/api/orders/${order.body.token}`)).body.status, 'paid');
    await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(ctx.store.find('products', 2).stock, 2, 'stock is only reduced once');
  });
});

describe('store', () => {
  test('reloads saved data after a restart', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'artist-studio-'));
    tempDirs.push(dataDir);
    const first = await createStore({ dataDir, seed });
    await first.insert('messages', { name: 'Kept', createdAt: new Date().toISOString() });

    const second = await createStore({ dataDir, seed });
    assert.equal(second.all('messages')[0].name, 'Kept');
  });
});
