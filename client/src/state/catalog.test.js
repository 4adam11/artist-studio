import { describe, expect, test } from 'vitest';
import { filterProducts, findVariant, initialSelection, isValueAvailable, matchesQuery, productsInCollection, relatedProducts } from './catalog.js';

const products = [
  { id: 1, title: 'Mini Study', productType: 'Painting', tags: ['wall art'], priceMin: 28, priceMax: 28, available: true, createdAt: '2026-01-01' },
  { id: 2, title: 'Pouch', productType: 'Crochet', tags: ['gift'], description: 'cotton yarn', priceMin: 24, priceMax: 24, available: false, createdAt: '2026-03-01' },
  { id: 3, title: 'Throw', productType: 'Crochet', tags: ['home'], priceMin: 140, priceMax: 190, available: true, createdAt: '2026-02-01' }
];
const ids = (list) => list.map((item) => item.id);

describe('browsing', () => {
  test('matchesQuery needs every word and searches tags', () => {
    expect(matchesQuery('COTTON pouch', ['Pouch', 'cotton yarn'])).toBe(true);
    expect(matchesQuery('wall', ['Mini', ['wall art']])).toBe(true);
    expect(matchesQuery('cotton blanket', ['Pouch', 'cotton yarn'])).toBe(false);
  });

  test('filters by text, type and availability without reordering by default', () => {
    expect(ids(filterProducts(products, { q: 'gift' }))).toEqual([2]);
    expect(ids(filterProducts(products, { type: 'Crochet' }))).toEqual([2, 3]);
    expect(ids(filterProducts(products, { inStock: true }))).toEqual([1, 3]);
    expect(ids(filterProducts(products))).toEqual([1, 2, 3]);
  });

  test('sorts by date, price and title without changing the input', () => {
    const copy = [...products];
    expect(ids(filterProducts(products, { sort: 'newest' }))).toEqual([2, 3, 1]);
    expect(ids(filterProducts(products, { sort: 'price-asc' }))).toEqual([2, 1, 3]);
    expect(ids(filterProducts(products, { sort: 'price-desc' }))).toEqual([3, 1, 2]);
    expect(ids(filterProducts(products, { sort: 'title' }))).toEqual([1, 2, 3]);
    expect(products).toEqual(copy);
  });

  test('collections keep their manual order; related prefers the same collection', () => {
    const collections = [{ id: 1, productIds: [3, 1, 99] }, { id: 2, productIds: [2] }];
    expect(ids(productsInCollection(collections[0], products))).toEqual([3, 1]);
    const extra = [...products, { id: 4, title: 'Hat', available: true }];
    expect(ids(relatedProducts(extra[0], extra, collections))).toEqual([3, 4]);
  });
});

describe('variants', () => {
  const product = {
    options: [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Oat', 'Clay'] }],
    variants: [
      { id: 'a', options: ['S', 'Oat'], available: false },
      { id: 'b', options: ['S', 'Clay'], available: true },
      { id: 'c', options: ['M', 'Oat'], available: true },
      { id: 'd', options: ['M', 'Clay'], available: false }
    ]
  };

  test('finds the variant for a selection and starts on an available one', () => {
    expect(findVariant(product, ['M', 'Oat']).id).toBe('c');
    expect(initialSelection(product)).toEqual(['S', 'Clay']);
  });

  test('marks values that have no stock for the current selection', () => {
    expect(isValueAvailable(product, ['S', 'Clay'], 1, 'Oat')).toBe(false);
    expect(isValueAvailable(product, ['M', 'Clay'], 1, 'Oat')).toBe(true);
    expect(isValueAvailable(product, ['S', 'Clay'], 0, 'M')).toBe(true);
  });
});
