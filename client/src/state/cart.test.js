import { describe, expect, test } from 'vitest';
import { addItem, cartCount, cartSubtotal, parseStoredCart, removeItem, resolveCart, setQuantity } from './cart.js';

const products = [
  { id: 1, title: 'Print', variants: [{ id: 'a', options: [], price: 28, stock: 2 }] },
  { id: 2, title: 'Pouch', variants: [{ id: 'b', options: ['Sand'], price: 24.5, stock: 0 }, { id: 'c', options: ['Sage'], price: 24.5, stock: 5 }] }
];

describe('cart', () => {
  test('adds items and increases quantity up to the stock limit', () => {
    let cart = addItem([], 'a', 1, 2);
    cart = addItem(cart, 'a', 1, 2);
    cart = addItem(cart, 'a', 1, 2);
    expect(cart).toEqual([{ variantId: 'a', quantity: 2 }]);
    expect(addItem([], 'c', 9, 5)).toEqual([{ variantId: 'c', quantity: 5 }]);
  });

  test('does not add sold-out variants', () => {
    expect(addItem([], 'b', 1, 0)).toEqual([]);
  });

  test('setQuantity clamps between 1 and stock and ignores bad input', () => {
    const cart = [{ variantId: 'c', quantity: 2 }];
    expect(setQuantity(cart, 'c', 0, 5)).toEqual([{ variantId: 'c', quantity: 1 }]);
    expect(setQuantity(cart, 'c', 9, 5)).toEqual([{ variantId: 'c', quantity: 5 }]);
    expect(setQuantity(cart, 'c', Number.NaN, 5)).toBe(cart);
  });

  test('removes items and counts quantities', () => {
    const cart = [{ variantId: 'a', quantity: 2 }, { variantId: 'c', quantity: 1 }];
    expect(cartCount(cart)).toBe(3);
    expect(removeItem(cart, 'a')).toEqual([{ variantId: 'c', quantity: 1 }]);
  });

  test('resolveCart drops missing or sold-out variants and caps quantities', () => {
    const cart = [{ variantId: 'a', quantity: 5 }, { variantId: 'b', quantity: 1 }, { variantId: 'zzz', quantity: 1 }, { variantId: 'c', quantity: 2 }];
    const { lines, changed } = resolveCart(cart, products);
    expect(changed).toBe(true);
    expect(lines.map((line) => [line.variant.id, line.quantity, line.product.title])).toEqual([['a', 2, 'Print'], ['c', 2, 'Pouch']]);
    expect(cartSubtotal(lines)).toBe(105);
    expect(resolveCart([{ variantId: 'c', quantity: 2 }], products).changed).toBe(false);
  });

  test('parseStoredCart survives corrupt or old-format data', () => {
    expect(parseStoredCart('not json')).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(parseStoredCart('[{"id":1,"quantity":2},{"variantId":"a","quantity":2},{"variantId":"b","quantity":0}]')).toEqual([{ variantId: 'a', quantity: 2 }]);
  });
});
