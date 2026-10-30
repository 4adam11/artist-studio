import { randomUUID } from 'node:crypto';
import { getSettings } from './settings.js';

export const ORDER_STATUSES = ['awaiting_payment', 'paid', 'received', 'shipped', 'cancelled'];
export const CONFIRMED_STATUSES = ['paid', 'received', 'shipped'];

const round = (amount) => Math.round(amount * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

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
    items.push({ productId, title: product.title, price: product.price, quantity, image: product.image });
  }

  return { items };
}

export function findDiscount(store, code, subtotal) {
  if (!code) return {};
  const normalized = String(code).trim().toUpperCase();
  const discount = store.all('discounts').find((item) => item.code === normalized);
  if (!discount || !discount.active) return { error: `"${normalized}" is not a valid discount code` };
  if (discount.expiresAt && discount.expiresAt < today()) return { error: `"${normalized}" has expired` };
  if (discount.minSubtotal && subtotal < discount.minSubtotal) {
    return { error: `"${normalized}" needs an order of at least ${discount.minSubtotal.toFixed(2)}` };
  }
  const amount = discount.type === 'percent'
    ? round(subtotal * Math.min(discount.amount, 100) / 100)
    : Math.min(discount.amount, subtotal);
  return { discount: { id: discount.id, code: discount.code, amount: round(amount) } };
}

// Works out everything the buyer pays: items, discount, shipping and total.
// Used both for the live summary at checkout and for the order itself, so the
// buyer always sees exactly what they will be charged.
export function priceOrder(store, rawItems, discountCode) {
  const { items, error } = buildOrderItems(store, rawItems);
  if (error) return { error };

  const settings = getSettings(store);
  const subtotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const { discount = null, error: discountError } = findDiscount(store, discountCode, subtotal);
  const afterDiscount = round(subtotal - (discount?.amount || 0));
  const freeShipping = settings.freeShippingOver > 0 && afterDiscount >= settings.freeShippingOver;
  const shipping = freeShipping ? 0 : settings.shippingFlat;

  return { items, subtotal, discount, discountError, shipping, total: round(afterDiscount + shipping) };
}

export function newOrder(fields) {
  return { token: randomUUID(), ...fields, trackingNumber: '', createdAt: new Date().toISOString() };
}

// Called once an order is confirmed (paid online, or accepted for manual
// payment): takes the items out of stock, counts the discount use and sends
// the emails.
export async function fulfillOrder({ store, mailer }, order, status) {
  for (const item of order.items) {
    const product = store.find('products', item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.quantity);
  }
  if (order.discount) {
    const discount = store.find('discounts', order.discount.id);
    if (discount) discount.uses = (discount.uses || 0) + 1;
  }
  order.status = status;
  await store.save();
  await mailer.orderPlaced(order);
  await mailer.orderConfirmation(order);
}

export function publicOrder(order, currency) {
  const { id, status, name, items, subtotal, discount, shipping, total, address, trackingNumber, createdAt } = order;
  return {
    id, status, name, items, total, address, trackingNumber, createdAt, currency,
    subtotal: subtotal ?? total,
    shipping: shipping ?? 0,
    discount: discount ? { code: discount.code, amount: discount.amount } : null
  };
}
