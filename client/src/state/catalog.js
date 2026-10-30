// Pure helpers for searching, filtering and sorting products (no React).

// Every word of the query must appear somewhere in the given fields.
export function matchesQuery(query, fields) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}

export const SORT_OPTIONS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated']
];

const productText = (product) => [product.title, product.category, product.description, product.materials];

export function filterProducts(products, { q = '', category = 'All', sort = 'featured', inStock = false } = {}) {
  const result = products.filter((product) =>
    (category === 'All' || product.category === category) &&
    (!inStock || product.stock > 0) &&
    matchesQuery(q, productText(product)));

  const available = (product) => (product.stock > 0 ? 1 : 0);
  const sorters = {
    // Available pieces first, then newest.
    featured: (a, b) => available(b) - available(a) || b.id - a.id,
    newest: (a, b) => b.id - a.id,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => (b.rating?.average || 0) - (a.rating?.average || 0) || (b.rating?.count || 0) - (a.rating?.count || 0)
  };
  return result.sort(sorters[sort] || sorters.featured);
}

// "You may also like": same category first, then other available pieces.
export function relatedProducts(product, products, limit = 4) {
  return products
    .filter((item) => item.id !== product.id && item.stock > 0)
    .sort((a, b) => (b.category === product.category) - (a.category === product.category) || b.id - a.id)
    .slice(0, limit);
}
