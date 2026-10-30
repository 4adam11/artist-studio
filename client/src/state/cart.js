// Pure cart helpers (no React) so they are easy to test.
//
// The cart only stores [{ id, quantity }]. Titles, prices and stock always come
// from the latest product data, so a saved cart never shows a stale price.

export function addToCart(cart, id, stock = Infinity) {
  const existing = cart.find((item) => item.id === id);
  if (!existing) return stock > 0 ? [...cart, { id, quantity: 1 }] : cart;
  return setQuantity(cart, id, existing.quantity + 1, stock);
}

export function setQuantity(cart, id, quantity, stock = Infinity) {
  if (!Number.isFinite(quantity)) return cart;
  const clamped = Math.min(Math.max(1, Math.floor(quantity)), stock);
  if (clamped < 1) return removeFromCart(cart, id);
  return cart.map((item) => (item.id === id ? { ...item, quantity: clamped } : item));
}

export function removeFromCart(cart, id) {
  return cart.filter((item) => item.id !== id);
}

export function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Matches the saved cart against current products. Items that were removed or
// sold out are dropped, and quantities are capped at what is in stock.
// `changed` tells the caller whether the saved cart needs updating.
export function resolveCart(cart, products) {
  const lines = [];
  let changed = false;

  for (const entry of cart) {
    const product = products.find((item) => item.id === entry.id);
    if (!product || product.stock < 1) {
      changed = true;
      continue;
    }
    const quantity = Math.min(entry.quantity, product.stock);
    if (quantity !== entry.quantity) changed = true;
    lines.push({ product, quantity });
  }

  return { lines, changed };
}

export function cartTotal(lines) {
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  return Math.round(total * 100) / 100;
}

export function parseStoredCart(raw) {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item) => Number.isInteger(item?.id) && Number.isInteger(item?.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
}
