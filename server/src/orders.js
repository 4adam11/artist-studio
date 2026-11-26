import { randomUUID } from 'node:crypto';
import { findVariant, isListed, variantTitle } from './catalog.js';
import { getSettings } from './settings.js';

const round = (amount) => Math.round(amount * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

export const orderNumber = (order) => 1000 + order.id;

// Turns the cart a customer sent into order lines, using the server's own
// prices and stock. Prices sent by the browser are ignored so they can't be
// changed by the buyer.
export function buildOrderItems(store, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Your cart is empty' };
  if (rawItems.length > 50) return { error: 'Too many items in one order' };

  const quantities = new Map();
  for (const raw of rawItems) {
    const variantId = typeof raw?.variantId === 'string' ? raw.variantId : '';
    const quantity = Number(raw?.quantity);
    if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return { error: 'Your cart contains an invalid item' };
    }
    quantities.set(variantId, (quantities.get(variantId) || 0) + quantity);
  }

  const items = [];
  for (const [variantId, quantity] of quantities) {
    const found = findVariant(store, variantId);
    if (!found || !isListed(found.product)) return { error: 'One of the items in your cart is no longer available' };
    const { product, variant } = found;
    const name = variant.options.length ? `${product.title} (${variantTitle(variant)})` : product.title;
    if (variant.stock < quantity) {
      return { error: variant.stock === 0 ? `${name} is sold out` : `Only ${variant.stock} of ${name} left in stock` };
    }
    items.push({
      productId: product.id,
      variantId,
      title: product.title,
      variantTitle: variantTitle(variant),
      sku: variant.sku,
      price: variant.price,
      quantity,
      image: product.images[0] || ''
    });
  }

  return { items };
}

export function findDiscount(store, code, subtotal) {
  if (!code) return {};
  const normalized = String(code).trim().toUpperCase();
  const discount = store.all('discounts').find((item) => item.code === normalized);
  if (!discount || !discount.active) return { error: `${normalized} is not a valid discount code` };
  if (discount.expiresAt && discount.expiresAt < today()) return { error: `${normalized} has expired` };
  if (discount.usageLimit && (discount.uses || 0) >= discount.usageLimit) return { error: `${normalized} has been fully used` };
  if (discount.minSubtotal && subtotal < discount.minSubtotal) {
    return { error: `${normalized} needs an order of at least ${discount.minSubtotal.toFixed(2)}` };
  }
  const amount = discount.type === 'percent'
    ? round(subtotal * Math.min(discount.amount, 100) / 100)
    : discount.type === 'fixed' ? Math.min(discount.amount, subtotal) : 0;
  return { discount: { id: discount.id, code: discount.code, type: discount.type, amount: round(amount) } };
}

// Works out everything the buyer pays: items, discount, shipping, tax, total.
// Used for the live summary at checkout and for the order itself, so the
// buyer always sees exactly what they will be charged.
export function priceOrder(store, config, { items: rawItems, discountCode, shippingRateId }) {
  const { items, error } = buildOrderItems(store, rawItems);
  if (error) return { error };

  const settings = getSettings(store, config);
  const subtotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const { discount = null, error: discountError } = findDiscount(store, discountCode, subtotal);
  const afterDiscount = round(subtotal - (discount?.amount || 0));

  const rates = settings.shippingRates.map((rate) => ({
    id: rate.id,
    name: rate.name,
    price: discount?.type === 'shipping' || (rate.freeOver > 0 && afterDiscount >= rate.freeOver) ? 0 : rate.price
  }));
  const shipping = rates.find((rate) => rate.id === shippingRateId) || rates[0];
  const tax = round(afterDiscount * (settings.taxRate || 0) / 100);

  return {
    items, subtotal, discount, discountError, shippingRates: rates,
    shipping, tax, total: round(afterDiscount + shipping.price + tax), currency: settings.currency
  };
}

export function newOrder(fields) {
  return {
    token: randomUUID(),
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'unfulfilled',
    trackingNumber: '',
    trackingUrl: '',
    staffNote: '',
    createdAt: new Date().toISOString(),
    ...fields
  };
}

function changeStock(store, items, direction) {
  for (const item of items) {
    const found = findVariant(store, item.variantId);
    if (found) found.variant.stock = Math.max(0, found.variant.stock + direction * item.quantity);
  }
}

// Called once an order is placed for real (paid online, or accepted for
// manual payment): takes the items out of stock, counts the discount use
// and sends the emails.
export async function confirmOrder({ store, mailer }, order, { paid }) {
  changeStock(store, order.items, -1);
  if (order.discount) {
    const discount = store.find('discounts', order.discount.id);
    if (discount) discount.uses = (discount.uses || 0) + 1;
  }
  order.status = 'open';
  if (paid) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
  }
  await store.save();
  await mailer.orderPlaced(order);
  await mailer.orderConfirmation(order);
}

export async function cancelOrder(store, order, { restock }) {
  if (restock && order.status === 'open') changeStock(store, order.items, +1);
  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();
  await store.save();
}

export function publicOrder(order) {
  const {
    id, token, status, paymentStatus, fulfillmentStatus, customer, shippingAddress, items, subtotal,
    discount, shipping, tax, total, currency, trackingNumber, trackingUrl, createdAt
  } = order;
  return {
    id, number: orderNumber(order), token, status, paymentStatus, fulfillmentStatus,
    customerName: `${customer.firstName} ${customer.lastName}`, shippingAddress, items, subtotal,
    discount: discount ? { code: discount.code, amount: discount.amount, type: discount.type } : null,
    shipping, tax, total, currency, trackingNumber, trackingUrl, createdAt
  };
}
