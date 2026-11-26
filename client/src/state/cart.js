// Pure cart helpers (no React), easy to test.
//
// The cart only stores [{ variantId, quantity }]. Titles, prices and stock
// always come from the latest product data, so a saved cart never shows a
// stale price.

export function addItem(cart, variantId, quantity = 1, max = Infinity) {
  const existing = cart.find((item) => item.variantId === variantId);
  if (!existing) return max > 0 ? [...cart, { variantId, quantity: Math.min(quantity, max) }] : cart;
  return setQuantity(cart, variantId, existing.quantity + quantity, max);
}

export function setQuantity(cart, variantId, quantity, max = Infinity) {
  if (!Number.isFinite(quantity)) return cart;
  const clamped = Math.min(Math.max(1, Math.floor(quantity)), max);
  if (clamped < 1) return removeItem(cart, variantId);
  return cart.map((item) => (item.variantId === variantId ? { ...item, quantity: clamped } : item));
}

export function removeItem(cart, variantId) {
  return cart.filter((item) => item.variantId !== variantId);
}

export const cartCount = (cart) => cart.reduce((sum, item) => sum + item.quantity, 0);

// Matches the saved cart against current products. Items that were removed
// or sold out are dropped, and quantities are capped at what is in stock.
// `changed` tells the caller whether the saved cart needs updating.
export function resolveCart(cart, products) {
  const byVariant = new Map();
  for (const product of products) for (const variant of product.variants) byVariant.set(variant.id, { product, variant });

  const lines = [];
  let changed = false;
  for (const item of cart) {
    const found = byVariant.get(item.variantId);
    if (!found || found.variant.stock < 1) {
      changed = true;
      continue;
    }
    const quantity = Math.min(item.quantity, found.variant.stock);
    if (quantity !== item.quantity) changed = true;
    lines.push({ ...found, quantity });
  }
  return { lines, changed };
}

export function cartSubtotal(lines) {
  return Math.round(lines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0) * 100) / 100;
}

export function parseStoredCart(raw) {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item) => typeof item?.variantId === 'string' && Number.isInteger(item?.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
}
