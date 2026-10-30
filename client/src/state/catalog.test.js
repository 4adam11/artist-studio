import { describe, expect, test } from 'vitest';
import { filterProducts, matchesQuery, relatedProducts } from './catalog.js';

const products = [
  { id: 1, title: 'Mini Fabric Study', category: 'Fabric Painting', description: 'Small painting', materials: 'cotton', price: 28, stock: 5, rating: { average: 4, count: 2 } },
  { id: 2, title: 'Crochet Pouch', category: 'Crochet', description: 'Soft pouch', materials: 'cotton yarn', price: 24, stock: 0, rating: { average: 0, count: 0 } },
  { id: 3, title: 'Ocean Throw', category: 'Crochet', description: 'Blanket', materials: 'merino', price: 180, stock: 1, rating: { average: 5, count: 1 } }
];

const ids = (list) => list.map((product) => product.id);

describe('catalog', () => {
  test('matchesQuery needs every word, ignoring case', () => {
    expect(matchesQuery('COTTON pouch', ['Crochet Pouch', 'cotton yarn'])).toBe(true);
    expect(matchesQuery('cotton blanket', ['Crochet Pouch', 'cotton yarn'])).toBe(false);
    expect(matchesQuery('  ', ['anything'])).toBe(true);
  });

  test('filters by search, category and availability', () => {
    expect(ids(filterProducts(products, { q: 'cotton' }))).toEqual([1, 2]);
    expect(ids(filterProducts(products, { category: 'Crochet' }))).toEqual([3, 2]);
    expect(ids(filterProducts(products, { category: 'Crochet', inStock: true }))).toEqual([3]);
  });

  test('sorts by price, rating and puts available pieces first by default', () => {
    expect(ids(filterProducts(products, { sort: 'price-asc' }))).toEqual([2, 1, 3]);
    expect(ids(filterProducts(products, { sort: 'price-desc' }))).toEqual([3, 1, 2]);
    expect(ids(filterProducts(products, { sort: 'rating' }))).toEqual([3, 1, 2]);
    expect(ids(filterProducts(products))).toEqual([3, 1, 2]);
  });

  test('does not change the original list', () => {
    const copy = [...products];
    filterProducts(products, { sort: 'price-desc' });
    expect(products).toEqual(copy);
  });

  test('related products prefer the same category and skip sold-out pieces', () => {
    const extra = [...products, { id: 4, title: 'Hat', category: 'Crochet', price: 30, stock: 2 }];
    expect(ids(relatedProducts(extra[2], extra))).toEqual([4, 1]);
  });
});
