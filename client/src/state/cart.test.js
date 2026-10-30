import { describe, expect, test } from 'vitest';
import { addToCart, cartCount, cartTotal, parseStoredCart, removeFromCart, resolveCart, setQuantity } from './cart.js';

const products = [
  { id: 1, title: 'Study', price: 28, stock: 2 },
  { id: 2, title: 'Pouch', price: 24.5, stock: 0 },
  { id: 3, title: 'Throw', price: 120, stock: 5 }
];

describe('cart', () => {
  test('adds new items and increases existing ones up to the stock limit', () => {
    let cart = addToCart([], 1, 2);
    expect(cart).toEqual([{ id: 1, quantity: 1 }]);
    cart = addToCart(cart, 1, 2);
    cart = addToCart(cart, 1, 2);
    expect(cart).toEqual([{ id: 1, quantity: 2 }]);
  });

  test('does not add sold-out items', () => {
    expect(addToCart([], 2, 0)).toEqual([]);
  });

  test('setQuantity clamps between 1 and stock and ignores bad input', () => {
    const cart = [{ id: 3, quantity: 2 }];
    expect(setQuantity(cart, 3, 0, 5)).toEqual([{ id: 3, quantity: 1 }]);
    expect(setQuantity(cart, 3, 9, 5)).toEqual([{ id: 3, quantity: 5 }]);
    expect(setQuantity(cart, 3, Number.NaN, 5)).toBe(cart);
  });

  test('removes items and counts quantities', () => {
    const cart = [{ id: 1, quantity: 2 }, { id: 3, quantity: 1 }];
    expect(cartCount(cart)).toBe(3);
    expect(removeFromCart(cart, 1)).toEqual([{ id: 3, quantity: 1 }]);
  });

  test('resolveCart drops missing or sold-out products and caps quantities', () => {
    const cart = [{ id: 1, quantity: 5 }, { id: 2, quantity: 1 }, { id: 99, quantity: 1 }, { id: 3, quantity: 1 }];
    const { lines, changed } = resolveCart(cart, products);
    expect(changed).toBe(true);
    expect(lines.map((line) => [line.product.id, line.quantity])).toEqual([[1, 2], [3, 1]]);
    expect(cartTotal(lines)).toBe(176);
  });

  test('resolveCart reports no change for a valid cart', () => {
    expect(resolveCart([{ id: 3, quantity: 2 }], products).changed).toBe(false);
  });

  test('parseStoredCart survives corrupt or unexpected data', () => {
    expect(parseStoredCart('not json')).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(parseStoredCart('[{"id":1,"quantity":2},{"id":"x","quantity":1},{"id":2,"quantity":0}]')).toEqual([{ id: 1, quantity: 2 }]);
  });
});
