// Pure helpers for browsing products and choosing variants (no React).

// Every word of the query must appear somewhere in the given fields.
export function matchesQuery(query, fields) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = fields.flat().filter(Boolean).join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}

export const productText = (product) => [product.title, product.productType, product.vendor, product.description, product.tags];

export const SORT_OPTIONS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price, low to high'],
  ['price-desc', 'Price, high to low'],
  ['title', 'Alphabetically, A–Z']
];

// `products` arrive in "featured" order (e.g. a collection's manual order).
export function filterProducts(products, { q = '', type = '', inStock = false, sort = 'featured' } = {}) {
  const result = products.filter((product) =>
    (!type || product.productType === type) &&
    (!inStock || product.available) &&
    matchesQuery(q, productText(product)));

  const sorters = {
    newest: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id,
    'price-asc': (a, b) => a.priceMin - b.priceMin,
    'price-desc': (a, b) => b.priceMax - a.priceMax,
    title: (a, b) => a.title.localeCompare(b.title)
  };
  return sorters[sort] ? result.sort(sorters[sort]) : result;
}

export function productsInCollection(collection, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return collection.productIds.map((id) => byId.get(id)).filter(Boolean);
}

export function relatedProducts(product, products, collections, limit = 4) {
  const sameCollection = new Set(collections.filter((c) => c.productIds.includes(product.id)).flatMap((c) => c.productIds));
  return products
    .filter((item) => item.id !== product.id && item.available)
    .sort((a, b) => sameCollection.has(b.id) - sameCollection.has(a.id))
    .slice(0, limit);
}

// ---- Variants ----

export const findVariant = (product, selected) =>
  product.variants.find((variant) => variant.options.every((value, i) => value === selected[i]));

// Start on the first variant that is in stock.
export function initialSelection(product) {
  return [...(product.variants.find((variant) => variant.available) || product.variants[0]).options];
}

// Is there an in-stock variant with this value, keeping the other choices?
export function isValueAvailable(product, selected, optionIndex, value) {
  return product.variants.some((variant) =>
    variant.available &&
    variant.options[optionIndex] === value &&
    variant.options.every((v, i) => i === optionIndex || i > optionIndex || v === selected[i]));
}

export const onSale = (variant) => Boolean(variant.compareAtPrice && variant.compareAtPrice > variant.price);
export const productOnSale = (product) => product.variants.some(onSale);
