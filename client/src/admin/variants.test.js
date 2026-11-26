import { describe, expect, test } from 'vitest';
import { combinations, parseValues, syncVariants } from './variants.js';

describe('variant builder', () => {
  test('combinations covers every value of every option', () => {
    expect(combinations([])).toEqual([[]]);
    expect(combinations([{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Oat', 'Clay'] }]))
      .toEqual([['S', 'Oat'], ['S', 'Clay'], ['M', 'Oat'], ['M', 'Clay']]);
  });

  test('adding the first option copies the single price to every value', () => {
    const single = [{ id: 'a', options: [], price: 40, compareAtPrice: 50, sku: 'X', stock: 3 }];
    const result = syncVariants([{ name: 'Size', values: ['S', 'M'] }], single);
    expect(result.map((v) => [v.options, v.price, v.compareAtPrice, v.stock, v.sku])).toEqual([[['S'], 40, 50, 0, ''], [['M'], 40, 50, 0, '']]);
  });

  test('existing variants keep their data; removed values disappear', () => {
    const variants = [
      { id: 'a', options: ['S'], price: 40, sku: 'S1', stock: 2 },
      { id: 'b', options: ['M'], price: 45, sku: 'M1', stock: 1 }
    ];
    const result = syncVariants([{ name: 'Size', values: ['M', 'L'] }], variants);
    expect(result[0]).toBe(variants[1]);
    expect(result[1]).toMatchObject({ id: undefined, options: ['L'], price: 40, stock: 0 });
  });

  test('adding a second option inherits from the matching first value', () => {
    const variants = [{ id: 'a', options: ['S'], price: 40, stock: 2 }, { id: 'b', options: ['M'], price: 45, stock: 1 }];
    const result = syncVariants([{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Oat'] }], variants);
    expect(result.map((v) => [v.options.join('/'), v.price])).toEqual([['S/Oat', 40], ['M/Oat', 45]]);
  });

  test('options without a name or values are ignored', () => {
    const variants = [{ id: 'a', options: [], price: 10, stock: 1 }];
    expect(syncVariants([{ name: '', values: ['S'] }, { name: 'Colour', values: [] }], variants)).toEqual(variants);
  });

  test('parseValues splits, trims and removes duplicates', () => {
    expect(parseValues(' S, M ,,M, L ')).toEqual(['S', 'M', 'L']);
  });
});
