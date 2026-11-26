// Store-wide settings edited on the admin Settings page. Stored as a single
// record in the "settings" collection; anything not set yet uses these defaults.
export const DEFAULT_SETTINGS = {
  storeName: 'Artist Studio',
  tagline: 'Fabric paintings, crochet and fiber work, made by hand.',
  // Shown in the bar at the top of every page. When empty, the storefront
  // shows the free-shipping threshold instead, if there is one.
  announcement: '',
  seoDescription: 'Handmade fabric paintings, crochet and fiber work.',
  currency: '',
  taxRate: 0,
  contactEmail: '',
  instagram: '',
  facebook: '',
  pinterest: '',
  tiktok: '',
  featuredCollectionId: 0,
  shippingRates: [
    { id: 'a1b2c3d4e5', name: 'Standard', price: 8, freeOver: 75 },
    { id: 'f6a7b8c9d0', name: 'Express', price: 20, freeOver: 0 }
  ]
};

export function getSettings(store, config) {
  const saved = store.find('settings', 1) || {};
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  delete settings.id;
  settings.currency = (settings.currency || config.currency || 'usd').toLowerCase();
  return settings;
}

export async function saveSettings(store, config, patch) {
  if (store.find('settings', 1)) await store.update('settings', 1, patch);
  else await store.insert('settings', { ...patch });
  return getSettings(store, config);
}
