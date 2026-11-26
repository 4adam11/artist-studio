import { slugify } from './validate.js';

// Picks a URL handle that no other record in the collection uses:
// "linen-dress", then "linen-dress-2", "linen-dress-3"…
export function uniqueHandle(store, collection, wanted, ownId) {
  const base = slugify(wanted);
  const taken = (handle) => store.all(collection).some((item) => item.handle === handle && item.id !== Number(ownId));
  let handle = base;
  for (let n = 2; taken(handle); n++) handle = `${base}-${n}`;
  return handle;
}

export const findByHandle = (store, collection, handle) => store.all(collection).find((item) => item.handle === handle);

export const variantTitle = (variant) => variant.options.join(' / ');

export function findVariant(store, variantId) {
  for (const product of store.all('products')) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

// What the storefront needs: active products only, with handy summary fields.
export function publicProduct(product) {
  const prices = product.variants.map((variant) => variant.price);
  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    images: product.images,
    options: product.options,
    variants: product.variants.map(({ id, options, price, compareAtPrice, stock: variantStock }) => ({
      id, options, price, compareAtPrice, available: variantStock > 0, stock: variantStock
    })),
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    available: stock > 0,
    createdAt: product.createdAt
  };
}

export const isListed = (product) => product.status === 'active';
