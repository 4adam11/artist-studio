import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { seed } from '../src/seed.js';
import { createStore } from '../src/store.js';

const ADMIN_PASSWORD = 'test-password';
const tempDirs = [];

const BUYER = {
  name: 'Test Buyer', email: 'buyer@example.com',
  line1: '1 Loom Lane', city: 'Weaverton', postalCode: '12345', country: 'USA'
};

// Records every email the app tries to send.
function fakeMailer() {
  const sent = [];
  return new Proxy({ enabled: false, sent }, {
    get: (target, key) => (key in target ? target[key] : (...args) => { sent.push([key, ...args]); })
  });
}

async function startServer({ payments = null, adminPassword = ADMIN_PASSWORD, withClient = false } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'artist-studio-'));
  tempDirs.push(dataDir);
  const clientDist = path.join(dataDir, 'client');
  if (withClient) {
    await mkdir(clientDist);
    await writeFile(path.join(clientDist, 'index.html'), '<html><head><title>Artist Studio</title></head><body><div id="root"></div></body></html>');
  }
  const config = { ...loadConfig({}), dataDir, adminPassword, clientDist, publicUrl: 'https://studio.test' };
  const store = await createStore({ dataDir, seed });
  const mailer = fakeMailer();
  const app = createApp({ store, config, mailer, payments });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, url, { body, token, form } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await res.text();
    let parsed = text;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return { status: res.status, body: parsed, type: res.headers.get('content-type') };
  }

  async function login() {
    const res = await call('POST', '/api/admin/login', { body: { password: ADMIN_PASSWORD } });
    assert.equal(res.status, 200);
    return res.body.token;
  }

  return { store, dataDir, mailer, call, login, close: () => new Promise((resolve) => server.close(resolve)) };
}

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('catalogue', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('lists artworks and products with rating summaries', async () => {
    const artworks = await ctx.call('GET', '/api/artworks');
    const products = await ctx.call('GET', '/api/products');
    assert.equal(artworks.body.length, seed.artworks.length);
    assert.deepEqual(products.body[0].rating, { average: 0, count: 0 });
    assert.ok(Array.isArray(products.body[0].gallery));
  });

  test('config includes shop settings', async () => {
    const res = await ctx.call('GET', '/api/config');
    assert.equal(res.body.onlinePayments, false);
    assert.equal(res.body.settings.shippingFlat, 8);
    assert.equal(res.body.settings.id, undefined);
  });

  test('journal only shows published posts; events are sorted by date', async () => {
    const token = await ctx.login();
    await ctx.call('POST', '/api/admin/posts', { token, body: { title: 'Draft', excerpt: 'x', body: 'y', image: '/a.jpg', published: false } });
    const posts = await ctx.call('GET', '/api/posts');
    assert.ok(posts.body.every((post) => post.published));
    const draft = ctx.store.all('posts').find((post) => post.title === 'Draft');
    assert.equal((await ctx.call('GET', `/api/posts/${draft.id}`)).status, 404);

    await ctx.call('POST', '/api/admin/events', { token, body: { title: 'Early', date: '2026-01-01', location: 'Here' } });
    const events = await ctx.call('GET', '/api/events');
    assert.equal(events.body[0].title, 'Early');
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await ctx.call('GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Not found');
  });
});

describe('forms', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('comments are validated and saved to disk', async () => {
    assert.equal((await ctx.call('POST', '/api/artworks/1/comments', { body: { name: 'A' } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/artworks/999/comments', { body: { name: 'A', message: 'Hi' } })).status, 404);

    const created = await ctx.call('POST', '/api/artworks/1/comments', { body: { name: '  Mina ', message: 'Lovely' } });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, 'Mina');

    const onDisk = JSON.parse(await readFile(path.join(ctx.dataDir, 'db.json'), 'utf8'));
    assert.ok(onDisk.comments.some((comment) => comment.message === 'Lovely'));
  });

  test('contact messages are stored, emailed and ignore honeypot spam', async () => {
    assert.equal((await ctx.call('POST', '/api/contact', { body: { name: 'B', email: 'nope', message: 'Hi' } })).status, 400);
    await ctx.call('POST', '/api/contact', { body: { name: 'B', email: 'b@example.com', message: 'Commission?' } });
    await ctx.call('POST', '/api/contact', { body: { name: 'Bot', email: 'bot@example.com', message: 'Buy', website: 'x' } });
    assert.equal(ctx.store.all('messages').length, 1);
    assert.ok(ctx.mailer.sent.some(([kind]) => kind === 'contactReceived'));
  });

  test('newsletter sign-up ignores duplicates and can be undone', async () => {
    await ctx.call('POST', '/api/subscribe', { body: { email: 'Fan@Example.com', source: 'footer' } });
    await ctx.call('POST', '/api/subscribe', { body: { email: 'fan@example.com' } });
    const subscribers = ctx.store.all('subscribers');
    assert.equal(subscribers.length, 1);
    assert.equal(subscribers[0].email, 'fan@example.com');

    await ctx.call('POST', '/api/unsubscribe', { body: { token: subscribers[0].token } });
    assert.equal(ctx.store.all('subscribers').length, 0);
  });
});

describe('commissions', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  const formWith = (fields, files = []) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    for (const [name, type] of files) form.append('references', new Blob(['fake image'], { type }), name);
    return form;
  };
  const request = { name: 'Rae', email: 'rae@example.com', type: 'Wall hanging', details: 'Blues and greens for a nursery' };

  test('accepts a request with reference photos and emails both sides', async () => {
    const res = await ctx.call('POST', '/api/commissions', { form: formWith(request, [['ref.png', 'image/png']]) });
    assert.equal(res.status, 201);
    const [saved] = ctx.store.all('commissions');
    assert.equal(saved.status, 'new');
    assert.match(saved.references[0], /^\/uploads\/ref-/);
    const kinds = ctx.mailer.sent.map(([kind]) => kind);
    assert.ok(kinds.includes('commissionReceived') && kinds.includes('commissionAcknowledged'));
  });

  test('rejects non-image files and invalid requests without keeping uploads', async () => {
    const before = (await readdir(path.join(ctx.dataDir, 'uploads'))).length;
    const badType = await ctx.call('POST', '/api/commissions', { form: formWith(request, [['x.svg', 'image/svg+xml']]) });
    assert.equal(badType.status, 400);
    const missing = await ctx.call('POST', '/api/commissions', { form: formWith({ name: 'Rae' }, [['ref.png', 'image/png']]) });
    assert.equal(missing.status, 400);
    assert.equal((await readdir(path.join(ctx.dataDir, 'uploads'))).length, before);
  });
});

describe('checkout', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('quote adds shipping below the free-shipping threshold', async () => {
    const quote = await ctx.call('POST', '/api/checkout/quote', { body: { items: [{ productId: 1, quantity: 1 }] } });
    assert.deepEqual([quote.body.subtotal, quote.body.shipping, quote.body.total], [28, 8, 36]);
  });

  test('quote gives free shipping over the threshold and applies discount codes', async () => {
    const quote = await ctx.call('POST', '/api/checkout/quote', {
      body: { items: [{ productId: 1, quantity: 3 }], discountCode: 'welcome10' }
    });
    assert.equal(quote.body.subtotal, 84);
    assert.deepEqual(quote.body.discount, { id: 1, code: 'WELCOME10', amount: 8.4 });
    assert.equal(quote.body.shipping, 0);
    assert.equal(quote.body.total, 75.6);
  });

  test('invalid discount codes are reported in quotes and rejected at checkout', async () => {
    const quote = await ctx.call('POST', '/api/checkout/quote', { body: { items: [{ productId: 1, quantity: 1 }], discountCode: 'NOPE' } });
    assert.match(quote.body.discountError, /not a valid/);
    const order = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, discountCode: 'NOPE', items: [{ productId: 1, quantity: 1 }] } });
    assert.equal(order.status, 400);
  });

  test('requires a shipping address', async () => {
    const { line1, ...noAddress } = BUYER;
    assert.ok(line1);
    const res = await ctx.call('POST', '/api/checkout', { body: { ...noAddress, items: [{ productId: 1, quantity: 1 }] } });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Address/);
  });

  test('places an order with server prices, reduces stock and emails buyer and artist', async () => {
    const tooMany = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, items: [{ productId: 2, quantity: 99 }] } });
    assert.match(tooMany.body.error, /Only 3/);

    const order = await ctx.call('POST', '/api/checkout', {
      body: { ...BUYER, discountCode: 'WELCOME10', items: [{ productId: 1, quantity: 2, price: 0.01 }, { productId: 2, quantity: 1 }] }
    });
    assert.equal(order.status, 201);

    const details = await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(details.body.status, 'received');
    assert.equal(details.body.subtotal, 80);
    assert.equal(details.body.discount.amount, 8);
    assert.equal(details.body.shipping, 8, '72 after discount is under the 75 free-shipping threshold');
    assert.equal(details.body.total, 80);
    assert.equal(details.body.address.city, 'Weaverton');
    assert.equal(details.body.email, undefined, 'buyer email is not exposed publicly');

    assert.equal(ctx.store.find('products', 1).stock, 3);
    assert.equal(ctx.store.find('discounts', 1).uses, 1);
    const kinds = ctx.mailer.sent.map(([kind]) => kind);
    assert.ok(kinds.includes('orderPlaced') && kinds.includes('orderConfirmation'));
  });

  test('shipping settings changed in admin apply to new quotes', async () => {
    const token = await ctx.login();
    await ctx.call('PUT', '/api/admin/settings', { token, body: { shippingFlat: 5, freeShippingOver: 0 } });
    const quote = await ctx.call('POST', '/api/checkout/quote', { body: { items: [{ productId: 1, quantity: 3 }] } });
    assert.equal(quote.body.shipping, 5);
  });
});

describe('reviews and stock alerts', () => {
  let ctx;
  let token;
  before(async () => { ctx = await startServer(); token = await ctx.login(); });
  after(() => ctx.close());

  test('reviews wait for approval and buyers are marked verified', async () => {
    await ctx.call('POST', '/api/checkout', { body: { ...BUYER, items: [{ productId: 1, quantity: 1 }] } });
    const review = { name: 'Test Buyer', email: 'BUYER@example.com', rating: 5, body: 'Beautiful work' };
    assert.equal((await ctx.call('POST', '/api/products/1/reviews', { body: { ...review, rating: 9 } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/products/1/reviews', { body: review })).status, 201);
    await ctx.call('POST', '/api/products/1/reviews', { body: { ...review, email: 'stranger@example.com', rating: 3 } });

    assert.equal((await ctx.call('GET', '/api/products/1/reviews')).body.length, 0);

    for (const saved of ctx.store.all('reviews')) {
      await ctx.call('PATCH', `/api/admin/reviews/${saved.id}`, { token, body: { approved: true } });
    }
    const visible = await ctx.call('GET', '/api/products/1/reviews');
    assert.equal(visible.body.length, 2);
    assert.equal(visible.body.find((item) => item.rating === 5).verified, true);
    assert.equal(visible.body.find((item) => item.rating === 3).verified, false);
    assert.equal(visible.body[0].email, undefined);

    const product = await ctx.call('GET', '/api/products/1');
    assert.deepEqual(product.body.rating, { average: 4, count: 2 });
  });

  test('restocking a sold-out product emails waiting customers once', async () => {
    await ctx.call('PUT', '/api/admin/products/2', { token, body: { stock: 0 } });
    await ctx.call('POST', '/api/products/2/notify', { body: { email: 'wait@example.com' } });
    await ctx.call('POST', '/api/products/2/notify', { body: { email: 'WAIT@example.com' } });
    assert.equal(ctx.store.all('stockAlerts').length, 1);

    await ctx.call('PUT', '/api/admin/products/2', { token, body: { stock: 2 } });
    await ctx.call('PUT', '/api/admin/products/2', { token, body: { stock: 3 } });
    const alerts = ctx.mailer.sent.filter(([kind]) => kind === 'backInStock');
    assert.equal(alerts.length, 1);
    assert.ok(ctx.store.all('stockAlerts')[0].notifiedAt);
  });
});

describe('admin', () => {
  let ctx;
  let token;
  before(async () => { ctx = await startServer(); token = await ctx.login(); });
  after(() => ctx.close());

  test('requires a valid session token, not the raw password', async () => {
    assert.equal((await ctx.call('POST', '/api/admin/login', { body: { password: 'wrong' } })).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session')).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: ADMIN_PASSWORD })).status, 401);
    const [body] = token.split('.');
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: `${body}.forged` })).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token })).status, 200);
  });

  test('creates, updates and deletes products with validated fields', async () => {
    const unsafe = await ctx.call('POST', '/api/admin/products', {
      token,
      body: { title: 'Scarf', category: 'Crochet', description: 'Warm', price: 40, stock: 1, image: 'javascript:alert(1)' }
    });
    assert.equal(unsafe.status, 400);

    const created = await ctx.call('POST', '/api/admin/products', {
      token,
      body: { title: 'Scarf', category: 'Crochet', description: 'Warm', price: 40, stock: 1, image: '/uploads/scarf.jpg', gallery: ['/uploads/b.jpg'] }
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.care, '');

    const updated = await ctx.call('PUT', `/api/admin/products/${created.body.id}`, { token, body: { price: 45, care: 'Hand wash' } });
    assert.equal(updated.body.price, 45);
    assert.equal(updated.body.title, 'Scarf');

    assert.equal((await ctx.call('DELETE', `/api/admin/products/${created.body.id}`, { token })).status, 204);
    assert.equal((await ctx.call('GET', `/api/products/${created.body.id}`)).status, 404);
  });

  test('discount codes are normalised and must be unique', async () => {
    const created = await ctx.call('POST', '/api/admin/discounts', { token, body: { code: 'spring-5', type: 'fixed', amount: 5 } });
    assert.equal(created.body.code, 'SPRING-5');
    const clash = await ctx.call('POST', '/api/admin/discounts', { token, body: { code: 'SPRING-5', type: 'fixed', amount: 5 } });
    assert.equal(clash.status, 400);
  });

  test('marking an order shipped saves tracking and emails the buyer once', async () => {
    const order = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, items: [{ productId: 1, quantity: 1 }] } });
    const [stored] = ctx.store.where('orders', (item) => item.token === order.body.token);
    assert.equal((await ctx.call('PATCH', `/api/admin/orders/${stored.id}`, { token, body: { status: 'lost' } })).status, 400);

    await ctx.call('PATCH', `/api/admin/orders/${stored.id}`, { token, body: { status: 'shipped', trackingNumber: ' TRACK123 ' } });
    await ctx.call('PATCH', `/api/admin/orders/${stored.id}`, { token, body: { status: 'shipped' } });
    const shippedEmails = ctx.mailer.sent.filter(([kind]) => kind === 'orderShipped');
    assert.equal(shippedEmails.length, 1);
    assert.equal(shippedEmails[0][1].trackingNumber, 'TRACK123');
  });

  test('stats and subscriber export', async () => {
    await ctx.call('POST', '/api/subscribe', { body: { email: 'a@example.com', source: 'footer' } });
    const stats = await ctx.call('GET', '/api/admin/stats', { token });
    assert.equal(stats.body.subscribers, 1);
    assert.ok(stats.body.ordersThisMonth >= 1);

    const csv = await ctx.call('GET', '/api/admin/subscribers.csv', { token });
    assert.match(csv.type, /text\/csv/);
    assert.match(csv.body, /"a@example.com","footer","[^"]+","https:\/\/studio\.test\/unsubscribe\/[\w-]+"/);
  });

  test('deleting an artwork also deletes its comments', async () => {
    await ctx.call('DELETE', '/api/admin/artworks/1', { token });
    assert.equal(ctx.store.where('comments', (comment) => comment.artworkId === 1).length, 0);
  });
});

describe('admin disabled', () => {
  test('returns 503 when no ADMIN_PASSWORD is set', async () => {
    const ctx = await startServer({ adminPassword: '' });
    assert.equal((await ctx.call('POST', '/api/admin/login', { body: { password: '' } })).status, 503);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: 'anything' })).status, 503);
    await ctx.close();
  });
});

describe('Stripe checkout', () => {
  test('passes shipping and discounts to Stripe and only takes stock once paid', async () => {
    let paid = false;
    const sessions = [];
    const payments = {
      createCheckoutSession: async (order) => { sessions.push(order); return { id: `cs_${order.id}`, url: 'https://checkout.stripe.test/pay' }; },
      getCheckoutSession: async () => ({ payment_status: paid ? 'paid' : 'unpaid' })
    };
    const ctx = await startServer({ payments });

    const order = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, discountCode: 'WELCOME10', items: [{ productId: 2, quantity: 1 }] } });
    assert.equal(order.body.paymentUrl, 'https://checkout.stripe.test/pay');
    assert.equal(sessions[0].shipping, 8);
    assert.equal(sessions[0].discount.amount, 2.4);
    assert.equal(ctx.store.find('products', 2).stock, 3);

    assert.equal((await ctx.call('GET', `/api/orders/${order.body.token}`)).body.status, 'awaiting_payment');
    paid = true;
    assert.equal((await ctx.call('GET', `/api/orders/${order.body.token}`)).body.status, 'paid');
    await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(ctx.store.find('products', 2).stock, 2, 'stock is only reduced once');
    assert.equal(ctx.mailer.sent.filter(([kind]) => kind === 'orderConfirmation').length, 1);
    await ctx.close();
  });
});

describe('link previews and search engines', () => {
  let ctx;
  before(async () => { ctx = await startServer({ withClient: true }); });
  after(() => ctx.close());

  test('product pages include title, preview image and product data', async () => {
    const res = await ctx.call('GET', '/shop/1');
    assert.match(res.body, /<title>Mini Fabric Study · Artist Studio<\/title>/);
    assert.match(res.body, /property="og:image" content="https:\/\/images\.unsplash\.com/);
    assert.match(res.body, /"@type":"Product"/);
    assert.match(res.body, /"availability":"https:\/\/schema.org\/InStock"/);
  });

  test('titles are HTML-escaped', async () => {
    const token = await ctx.login();
    const created = await ctx.call('POST', '/api/admin/artworks', {
      token, body: { title: '<script>x</script>', category: 'Other', description: 'd', image: '/a.jpg' }
    });
    const res = await ctx.call('GET', `/portfolio/${created.body.id}`);
    assert.ok(!res.body.includes('<script>x</script>'));
    assert.match(res.body, /&lt;script&gt;/);
  });

  test('sitemap and robots.txt', async () => {
    const map = await ctx.call('GET', '/sitemap.xml');
    assert.match(map.body, /<loc>https:\/\/studio\.test\/shop\/1<\/loc>/);
    const robots = await ctx.call('GET', '/robots.txt');
    assert.match(robots.body, /Disallow: \/admin/);
  });
});

describe('store', () => {
  test('reloads saved data after a restart and adds new collections to old files', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'artist-studio-'));
    tempDirs.push(dataDir);
    await writeFile(path.join(dataDir, 'db.json'), JSON.stringify({ artworks: [], products: [], messages: [{ id: 1, name: 'Old' }] }));
    const store = await createStore({ dataDir, seed });
    assert.equal(store.all('messages')[0].name, 'Old');
    assert.deepEqual(store.all('commissions'), []);
    await store.insert('messages', { name: 'Kept' });

    const reloaded = await createStore({ dataDir, seed });
    assert.equal(reloaded.all('messages')[1].name, 'Kept');
  });
});
