import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { seed } from '../src/seed.js';
import { createStore } from '../src/store.js';
import { loadEnvFile } from '../src/env.js';
import { slugify, validateProduct } from '../src/validate.js';

const ADMIN_PASSWORD = 'test-password';
const tempDirs = [];

const BUYER = {
  email: 'Buyer@Example.com', firstName: 'Test', lastName: 'Buyer',
  line1: '1 Loom Lane', city: 'Weaverton', postalCode: '12345', country: 'USA'
};
// Seed variant ids
const STUDY = '1b2c3d4e5f'; // Mini Fabric Study, 28, stock 6
const POUCH_SAGE = '3d4e5f6a7b'; // 24, stock 2
const POUCH_RUST = '4e5f6a7b8c'; // 24, sold out
const THROW_LAP = '5f6a7b8c9d'; // 140, compare-at 160

// Records every email the app tries to send.
function fakeMailer() {
  const sent = [];
  return new Proxy({ enabled: false, sent }, {
    get: (target, key) => (key in target ? target[key] : (...args) => { sent.push([key, ...args]); })
  });
}

async function startServer({ payments = null, adminPassword = ADMIN_PASSWORD, withClient = false } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'store-'));
  tempDirs.push(dataDir);
  const clientDist = path.join(dataDir, 'client');
  if (withClient) {
    await mkdir(clientDist);
    await writeFile(path.join(clientDist, 'index.html'), '<html><head><title>Store</title></head><body><div id="root"></div></body></html>');
  }
  const config = { ...loadConfig({}), dataDir, adminPassword, clientDist, publicUrl: 'https://shop.test' };
  const store = await createStore({ dataDir, seed });
  const mailer = fakeMailer();
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
    let parsed = text;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return { status: res.status, body: parsed, type: res.headers.get('content-type') };
  }

  const token = (await call('POST', '/api/admin/login', { body: { password: adminPassword } })).body?.token;
  const admin = (method, url, body) => call(method, `/api/admin${url}`, { body, token });
  const variantStock = (variantId) => store.all('products').flatMap((p) => p.variants).find((v) => v.id === variantId).stock;

  return { store, dataDir, mailer, call, admin, variantStock, close: () => new Promise((resolve) => server.close(resolve)) };
}

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('validation helpers', () => {
  test('slugify makes clean URL handles', () => {
    assert.equal(slugify('  Linen Dress — Größe M! '), 'linen-dress-grosse-m');
    assert.equal(slugify('!!!'), 'item');
  });

  test('products need variants that match their options', () => {
    const options = [{ name: 'Size', values: ['S', 'M'] }];
    assert.match(validateProduct({ title: 'Tee', options, variants: [] }).error, /at least one variant/);
    assert.match(validateProduct({ title: 'Tee', options, variants: [{ options: ['XL'], price: 10, stock: 1 }] }).error, /one value from every option/);
    assert.match(validateProduct({ title: 'Tee', options, variants: [{ options: ['S'], price: 10, stock: 1 }, { options: ['S'], price: 10, stock: 1 }] }).error, /listed twice/);
    assert.match(validateProduct({ title: 'Mug', variants: [{ price: 5, stock: 1 }, { price: 6, stock: 1 }] }).error, /exactly one variant/);

    const ok = validateProduct({ title: 'Tee', tags: 'cotton, basics, cotton', options, variants: [
      { options: ['S'], price: 10, compareAtPrice: 8, stock: 1 },
      { options: ['M'], price: 10, compareAtPrice: 15, stock: 0 }
    ] });
    assert.deepEqual(ok.value.tags, ['cotton', 'basics']);
    assert.equal(ok.value.variants[0].compareAtPrice, null, 'compare-at price below the price is dropped');
    assert.equal(ok.value.variants[1].compareAtPrice, 15);
    assert.match(ok.value.variants[0].id, /^[a-f0-9]{10}$/);
    assert.equal(ok.value.status, 'draft');
  });
});

describe('storefront', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('returns settings, active products with price ranges, collections and pages', async () => {
    await ctx.admin('PUT', '/products/5', { status: 'draft' });
    const res = await ctx.call('GET', '/api/storefront');
    assert.equal(res.body.settings.storeName, 'Artist Studio');
    assert.equal(res.body.settings.onlinePayments, false);
    assert.ok(!res.body.products.some((product) => product.id === 5), 'draft products are hidden');
    const throwProduct = res.body.products.find((product) => product.handle === 'ocean-crochet-throw');
    assert.deepEqual([throwProduct.priceMin, throwProduct.priceMax], [140, 190]);
    assert.equal(throwProduct.variants[0].sku, undefined, 'SKUs stay private');
    assert.deepEqual(res.body.collections.find((c) => c.handle === 'home').productIds, [4, 1]);
    assert.deepEqual(res.body.pages.map((page) => page.handle), ['about', 'shipping-returns', 'faq']);
  });

  test('product and page lookups by handle', async () => {
    assert.equal((await ctx.call('GET', '/api/products/crochet-pouch')).body.variants.length, 3);
    assert.equal((await ctx.call('GET', '/api/products/woven-basket')).status, 404);
    assert.match((await ctx.call('GET', '/api/pages/faq')).body.body, /handmade/);
    assert.equal((await ctx.call('GET', '/api/nope')).status, 404);
  });

  test('contact form validates, stores and notifies', async () => {
    assert.equal((await ctx.call('POST', '/api/contact', { body: { name: 'A', email: 'nope', message: 'Hi' } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/contact', { body: { name: 'A', email: 'a@x.com', subject: 'Spam', message: 'Hi' } })).status, 400);
    await ctx.call('POST', '/api/contact', { body: { name: 'A', email: 'a@x.com', subject: 'Custom order', message: 'A blue throw?' } });
    await ctx.call('POST', '/api/contact', { body: { name: 'Bot', email: 'b@x.com', message: 'Buy', website: 'x' } });
    assert.equal(ctx.store.all('messages').length, 1);
    assert.equal(ctx.store.all('messages')[0].subject, 'Custom order');
    assert.ok(ctx.mailer.sent.some(([kind]) => kind === 'contactReceived'));
  });

  test('newsletter sign-up ignores duplicates and can be undone', async () => {
    await ctx.call('POST', '/api/subscribe', { body: { email: 'Fan@Example.com', source: 'footer' } });
    await ctx.call('POST', '/api/subscribe', { body: { email: 'fan@example.com' } });
    const [subscriber] = ctx.store.all('subscribers');
    assert.equal(ctx.store.all('subscribers').length, 1);
    await ctx.call('POST', '/api/unsubscribe', { body: { token: subscriber.token } });
    assert.equal(ctx.store.all('subscribers').length, 0);
  });
});

describe('checkout', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  const quote = (body) => ctx.call('POST', '/api/checkout/quote', { body });

  test('quote charges standard shipping under the free threshold and offers every rate', async () => {
    const res = await quote({ items: [{ variantId: STUDY, quantity: 1 }] });
    assert.equal(res.body.subtotal, 28);
    assert.deepEqual(res.body.shippingRates.map((rate) => [rate.name, rate.price]), [['Standard', 8], ['Express', 20]]);
    assert.equal(res.body.shipping.name, 'Standard');
    assert.equal(res.body.total, 36);
  });

  test('quote applies free shipping, chosen rate, percent discounts and tax', async () => {
    const free = await quote({ items: [{ variantId: STUDY, quantity: 3 }] });
    assert.equal(free.body.shipping.price, 0);

    const express = await quote({ items: [{ variantId: STUDY, quantity: 3 }], shippingRateId: 'f6a7b8c9d0', discountCode: 'welcome10' });
    assert.deepEqual([express.body.subtotal, express.body.discount.amount, express.body.shipping.price, express.body.total], [84, 8.4, 20, 95.6]);

    await ctx.admin('PUT', '/settings', { taxRate: 10 });
    const taxed = await quote({ items: [{ variantId: STUDY, quantity: 1 }] });
    assert.equal(taxed.body.tax, 2.8);
    assert.equal(taxed.body.total, 38.8);
    await ctx.admin('PUT', '/settings', { taxRate: 0 });
  });

  test('free-shipping discount codes and invalid codes', async () => {
    await ctx.admin('POST', '/discounts', { code: 'shipfree', type: 'shipping' });
    const res = await quote({ items: [{ variantId: STUDY, quantity: 1 }], discountCode: 'SHIPFREE' });
    assert.equal(res.body.shipping.price, 0);
    assert.equal(res.body.total, 28);
    const bad = await quote({ items: [{ variantId: STUDY, quantity: 1 }], discountCode: 'NOPE' });
    assert.match(bad.body.discountError, /not a valid/);
  });

  test('rejects sold-out variants, too many items, and drafts', async () => {
    assert.match((await quote({ items: [{ variantId: POUCH_RUST, quantity: 1 }] })).body.error, /Crochet Pouch \(Rust\) is sold out/);
    assert.match((await quote({ items: [{ variantId: POUCH_SAGE, quantity: 5 }] })).body.error, /Only 2/);
    await ctx.admin('PUT', '/products/4', { status: 'draft' });
    assert.match((await quote({ items: [{ variantId: THROW_LAP, quantity: 1 }] })).body.error, /no longer available/);
    await ctx.admin('PUT', '/products/4', { status: 'active' });
  });

  test('places an order with server prices, reduces variant stock and emails both sides', async () => {
    const { line1, ...noAddress } = BUYER;
    assert.ok(line1);
    assert.equal((await ctx.call('POST', '/api/checkout', { body: { ...noAddress, items: [{ variantId: STUDY, quantity: 1 }] } })).status, 400);

    const order = await ctx.call('POST', '/api/checkout', {
      body: { ...BUYER, subscribe: true, discountCode: 'WELCOME10', items: [{ variantId: STUDY, quantity: 2, price: 0.01 }, { variantId: POUCH_SAGE, quantity: 1 }] }
    });
    assert.equal(order.status, 201);

    const details = await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(details.body.number, 1001);
    assert.equal(details.body.status, 'open');
    assert.equal(details.body.paymentStatus, 'unpaid');
    assert.deepEqual([details.body.subtotal, details.body.discount.amount, details.body.shipping.price, details.body.total], [80, 8, 8, 80]);
    assert.equal(details.body.items[1].variantTitle, 'Sage');
    assert.equal(details.body.customer, undefined, 'email is not exposed publicly');

    assert.equal(ctx.variantStock(STUDY), 4);
    assert.equal(ctx.variantStock(POUCH_SAGE), 1);
    assert.equal(ctx.store.find('discounts', 1).uses, 1);
    assert.equal(ctx.store.all('subscribers')[0].email, 'buyer@example.com');
    const kinds = ctx.mailer.sent.map(([kind]) => kind);
    assert.ok(kinds.includes('orderPlaced') && kinds.includes('orderConfirmation'));
  });

  test('order lookup needs the right number and email', async () => {
    assert.equal((await ctx.call('POST', '/api/orders/lookup', { body: { number: '#1001', email: 'someone@else.com' } })).status, 404);
    const found = await ctx.call('POST', '/api/orders/lookup', { body: { number: '#1001', email: ' BUYER@example.com ' } });
    assert.match(found.body.token, /^[\w-]{36}$/);
  });
});

describe('admin', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.close());

  test('requires a valid session token', async () => {
    assert.equal((await ctx.call('POST', '/api/admin/login', { body: { password: 'wrong' } })).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session')).status, 401);
    assert.equal((await ctx.call('GET', '/api/admin/session', { token: ADMIN_PASSWORD })).status, 401);
    assert.equal((await ctx.admin('GET', '/session')).status, 200);
  });

  test('creates products with variants, unique handles and collections', async () => {
    const body = {
      title: 'Linen Scarf', status: 'active', images: ['/uploads/a.jpg'], collectionIds: [2],
      options: [{ name: 'Colour', values: ['Oat', 'Clay'] }],
      variants: [{ options: ['Oat'], price: 45, stock: 3, sku: 'SC-OAT' }, { options: ['Clay'], price: 45, stock: 0 }]
    };
    const first = await ctx.admin('POST', '/products', body);
    const second = await ctx.admin('POST', '/products', body);
    assert.equal(first.status, 201);
    assert.equal(first.body.handle, 'linen-scarf');
    assert.equal(second.body.handle, 'linen-scarf-2');
    assert.ok(ctx.store.find('collections', 2).productIds.includes(first.body.id));

    const unsafe = await ctx.admin('POST', '/products', { ...body, images: ['javascript:alert(1)'] });
    assert.equal(unsafe.status, 400);

    const edited = await ctx.admin('PUT', `/products/${first.body.id}`, { handle: 'mini-fabric-study', collectionIds: [] });
    assert.equal(edited.body.handle, 'mini-fabric-study-2', 'handle clash is resolved');
    assert.ok(!ctx.store.find('collections', 2).productIds.includes(first.body.id));
    assert.deepEqual((await ctx.admin('GET', `/products/${first.body.id}`)).body.collectionIds, []);
  });

  test('duplicating a product makes an empty draft copy', async () => {
    const copy = await ctx.admin('POST', '/products/3/duplicate');
    assert.equal(copy.body.title, 'Crochet Pouch (copy)');
    assert.equal(copy.body.status, 'draft');
    assert.ok(copy.body.variants.every((variant) => variant.stock === 0));
    assert.ok(!copy.body.variants.some((variant) => variant.id === POUCH_SAGE));
  });

  test('deleting a product removes it from collections', async () => {
    await ctx.admin('DELETE', '/products/5');
    assert.ok(!ctx.store.find('collections', 3).productIds.includes(5));
  });

  test('orders: mark paid, fulfil with tracking (one email), cancel with restock', async () => {
    const placed = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, items: [{ variantId: STUDY, quantity: 2 }] } });
    const [order] = ctx.store.where('orders', (item) => item.token === placed.body.token);
    assert.equal(ctx.variantStock(STUDY), 4);

    await ctx.admin('POST', `/orders/${order.id}/mark-paid`);
    await ctx.admin('POST', `/orders/${order.id}/fulfill`, { trackingNumber: 'TRACK-1', trackingUrl: 'https://track.example/1' });
    await ctx.admin('POST', `/orders/${order.id}/fulfill`, { trackingNumber: 'TRACK-1' });
    const fetched = (await ctx.admin('GET', `/orders/${order.id}`)).body;
    assert.deepEqual([fetched.paymentStatus, fetched.fulfillmentStatus, fetched.trackingNumber, fetched.number], ['paid', 'fulfilled', 'TRACK-1', 1000 + order.id]);
    assert.equal(ctx.mailer.sent.filter(([kind]) => kind === 'orderShipped').length, 1);

    const second = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, items: [{ variantId: STUDY, quantity: 1 }] } });
    const [toCancel] = ctx.store.where('orders', (item) => item.token === second.body.token);
    assert.equal(ctx.variantStock(STUDY), 3);
    await ctx.admin('POST', `/orders/${toCancel.id}/cancel`, { restock: true });
    assert.equal(ctx.variantStock(STUDY), 4);
    assert.equal((await ctx.admin('POST', `/orders/${toCancel.id}/mark-paid`)).status, 400);
  });

  test('customers are built from orders', async () => {
    const customers = (await ctx.admin('GET', '/customers')).body;
    const buyer = customers.find((customer) => customer.email === 'buyer@example.com');
    assert.equal(buyer.orders, 2);
    assert.equal(buyer.spent, 64, '2 × 28 + 8 shipping; the cancelled order is not counted');
    const csv = await ctx.admin('GET', '/customers.csv');
    assert.match(csv.body, /"Test Buyer","buyer@example.com"/);
  });

  test('stats summarise sales, unfulfilled orders and low stock', async () => {
    const stats = (await ctx.admin('GET', '/stats')).body;
    assert.equal(stats.month.orders, 1);
    assert.equal(stats.month.sales, 64);
    assert.ok(stats.lowStock.some((item) => item.variant === 'Rust' && item.stock === 0));
    assert.equal(stats.recentOrders.length, 2);
  });

  test('discount codes are unique; pages and collections get handles', async () => {
    assert.equal((await ctx.admin('POST', '/discounts', { code: 'welcome10', type: 'percent', amount: 5 })).status, 400);
    assert.equal((await ctx.admin('POST', '/discounts', { code: 'ZERO', type: 'fixed', amount: 0 })).status, 400);
    const page = await ctx.admin('POST', '/pages', { title: 'Care Guide', body: 'Wash cold.' });
    assert.equal(page.body.handle, 'care-guide');
    const collection = await ctx.admin('POST', '/collections', { title: 'Crochet' });
    assert.equal(collection.body.handle, 'crochet-2');
  });

  test('settings validate shipping rates and currency', async () => {
    assert.equal((await ctx.admin('PUT', '/settings', { shippingRates: [] })).status, 400);
    assert.equal((await ctx.admin('PUT', '/settings', { currency: 'dollars' })).status, 400);
    const saved = await ctx.admin('PUT', '/settings', { storeName: 'Studio Shop', currency: 'EUR', shippingRates: [{ name: 'Post', price: 5 }] });
    assert.equal(saved.body.currency, 'eur');
    assert.equal(saved.body.shippingRates[0].freeOver, 0);
    const storefront = await ctx.call('GET', '/api/storefront');
    assert.equal(storefront.body.settings.storeName, 'Studio Shop');
  });

  test('disabled without ADMIN_PASSWORD', async () => {
    const off = await startServer({ adminPassword: '' });
    assert.equal((await off.call('POST', '/api/admin/login', { body: { password: '' } })).status, 503);
    assert.equal((await off.call('GET', '/api/admin/session', { token: 'x' })).status, 503);
    await off.close();
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

    const order = await ctx.call('POST', '/api/checkout', { body: { ...BUYER, discountCode: 'WELCOME10', items: [{ variantId: POUCH_SAGE, quantity: 1 }] } });
    assert.equal(order.body.paymentUrl, 'https://checkout.stripe.test/pay');
    assert.equal(sessions[0].shipping.price, 8);
    assert.equal(sessions[0].discount.amount, 2.4);
    assert.equal(ctx.variantStock(POUCH_SAGE), 2);
    assert.equal((await ctx.admin('GET', '/orders')).body.length, 0, 'unpaid Stripe checkouts are not listed as orders');

    assert.equal((await ctx.call('GET', `/api/orders/${order.body.token}`)).body.status, 'pending_payment');
    paid = true;
    const confirmed = (await ctx.call('GET', `/api/orders/${order.body.token}`)).body;
    assert.deepEqual([confirmed.status, confirmed.paymentStatus], ['open', 'paid']);
    await ctx.call('GET', `/api/orders/${order.body.token}`);
    assert.equal(ctx.variantStock(POUCH_SAGE), 1, 'stock is only reduced once');
    assert.equal(ctx.mailer.sent.filter(([kind]) => kind === 'orderConfirmation').length, 1);
    await ctx.close();
  });
});

describe('link previews and search engines', () => {
  let ctx;
  before(async () => { ctx = await startServer({ withClient: true }); });
  after(() => ctx.close());

  test('product pages include title, image and product data', async () => {
    const res = await ctx.call('GET', '/products/ocean-crochet-throw');
    assert.match(res.body, /<title>Ocean Crochet Throw · Artist Studio<\/title>/);
    assert.match(res.body, /property="og:image" content="https:\/\/images\.unsplash\.com/);
    assert.match(res.body, /"lowPrice":"140.00","highPrice":"190.00"/);
  });

  test('titles are HTML-escaped', async () => {
    await ctx.admin('POST', '/pages', { title: '<script>x</script>', body: 'Hello' });
    const res = await ctx.call('GET', '/pages/script-x-script');
    assert.ok(!res.body.includes('<script>x</script>'));
    assert.match(res.body, /&lt;script&gt;/);
  });

  test('sitemap and robots.txt', async () => {
    const map = await ctx.call('GET', '/sitemap.xml');
    assert.match(map.body, /<loc>https:\/\/shop\.test\/products\/crochet-pouch<\/loc>/);
    assert.match(map.body, /<loc>https:\/\/shop\.test\/collections\/home<\/loc>/);
    assert.match((await ctx.call('GET', '/robots.txt')).body, /Disallow: \/admin/);
  });
});

describe('store', () => {
  test('reloads saved data after a restart and adds new collections to old files', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'store-'));
    tempDirs.push(dataDir);
    await writeFile(path.join(dataDir, 'shop.json'), JSON.stringify({ products: [], messages: [{ id: 1, name: 'Old' }] }));
    const store = await createStore({ dataDir, seed });
    assert.deepEqual(store.all('orders'), []);
    await store.insert('messages', { name: 'Kept' });
    const reloaded = JSON.parse(await readFile(path.join(dataDir, 'shop.json'), 'utf8'));
    assert.equal(reloaded.messages[1].name, 'Kept');
  });
});

describe('.env loading', () => {
  test('reads KEY=value lines, handles quotes and comments, and never overrides real variables', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'store-env-'));
    tempDirs.push(dir);
    const file = path.join(dir, '.env');
    await writeFile(file, '# comment\r\nENV_TEST_A=hello\r\nENV_TEST_B="two words"\nENV_TEST_C=value # note\nENV_TEST_EMPTY=\nENV_TEST_KEEP=from-file\n');
    process.env.ENV_TEST_KEEP = 'already-set';
    assert.equal(loadEnvFile(file), true);
    assert.deepEqual(
      ['A', 'B', 'C', 'EMPTY', 'KEEP'].map((key) => process.env[`ENV_TEST_${key}`]),
      ['hello', 'two words', 'value', '', 'already-set']
    );
    assert.equal(loadEnvFile(path.join(dir, 'missing.env')), false);
  });
});
