// Shop-wide settings the artist edits on the admin page. Stored as a single
// record in the "settings" collection; anything not set yet uses these defaults.
export const DEFAULT_SETTINGS = {
  // Shown in the bar at the top of every page. When empty, the site shows the
  // free-shipping offer instead (if there is one).
  announcement: '',
  siteDescription: 'Hand-painted fabric art, crochet and fiber pieces, made slowly and with care.',
  shippingFlat: 8,
  freeShippingOver: 75,
  processingTime: 'Ready-made pieces ship within 3–5 business days',
  shipsTo: 'Shipping worldwide from the studio',
  contactEmail: '',
  instagram: '',
  facebook: '',
  pinterest: '',
  etsy: ''
};

export function getSettings(store) {
  return { ...DEFAULT_SETTINGS, ...(store.find('settings', 1) || {}), id: undefined };
}

export async function saveSettings(store, patch) {
  if (store.find('settings', 1)) await store.update('settings', 1, patch);
  else await store.insert('settings', { ...patch });
  return getSettings(store);
}
