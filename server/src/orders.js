import { randomUUID } from 'node:crypto';

export const ORDER_STATUSES = ['awaiting_payment', 'paid', 'received', 'shipped', 'cancelled'];

// Turns the cart a customer sent into order lines, using the server's own
// prices and stock. Prices sent by the browser are ignored so they can't be
// changed by the buyer.
export function buildOrderItems(store, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Your cart is empty' };
  if (rawItems.length > 50) return { error: 'Too many items in one order' };

  const quantities = new Map();
  for (const raw of rawItems) {
    const productId = Number(raw?.productId);
    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { error: 'Your cart contains an invalid item' };
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const items = [];
  for (const [productId, quantity] of quantities) {
    const product = store.find('products', productId);
    if (!product) return { error: 'One of the items in your cart is no longer available' };
    if (product.stock < quantity) {
      return {
        error: product.stock === 0
          ? `"${product.title}" has sold out`
          : `Only ${product.stock} of "${product.title}" left in stock`
      };
    }
    items.push({ productId, title: product.title, price: product.price, quantity });
  }

  const total = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  return { items, total };
}

export function newOrder({ name, email, note, items, total, status }) {
  return { token: randomUUID(), name, email, note, items, total, status, createdAt: new Date().toISOString() };
}

// Called once an order is confirmed (paid online, or accepted for manual
// payment): takes the items out of stock and lets the artist know.
export async function fulfillOrder({ store, mailer, currency }, order, status) {
  for (const item of order.items) {
    const product = store.find('products', item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.quantity);
  }
  order.status = status;
  await store.save();
  await mailer.orderPlaced(order, currency);
}

export function publicOrder(order, currency) {
  const { id, status, name, items, total, createdAt } = order;
  return { id, status, name, items, total, currency, createdAt };
}
