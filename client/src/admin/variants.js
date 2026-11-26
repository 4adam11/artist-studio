// Builds the variant list for a product from its options, like Shopify:
// every combination of option values is a variant.

// [{name:'Size',values:['S','M']},{name:'Colour',values:['Oat']}] -> [['S','Oat'],['M','Oat']]
export function combinations(options) {
  return options.reduce((combos, option) => combos.flatMap((combo) => option.values.map((value) => [...combo, value])), [[]]);
}

// Keeps the price, SKU and stock of variants that still exist when options
// change. A brand-new combination copies the price of the closest existing
// variant (e.g. adding a Size option to a product that had one price keeps
// that price for every size) and starts with no stock.
export function syncVariants(options, variants) {
  const usable = options.filter((option) => option.name.trim() && option.values.length);
  const fallback = variants[0] || { price: 0, compareAtPrice: null };

  return combinations(usable).map((combo) => {
    const exact = variants.find((variant) => variant.options.length === combo.length && variant.options.every((v, i) => v === combo[i]));
    if (exact) return exact;
    const similar = variants.find((variant) => variant.options.every((v, i) => combo[i] === v)) || fallback;
    return { id: undefined, options: combo, price: similar.price, compareAtPrice: similar.compareAtPrice ?? null, sku: '', stock: 0 };
  });
}

export const parseValues = (text) => [...new Set(text.split(',').map((value) => value.trim()).filter(Boolean))];
