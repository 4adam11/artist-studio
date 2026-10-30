// Field definitions for everything the artist creates on the admin page.
// Field types: text (default), textarea, number, date, checkbox, select, image, gallery.
const images = [
  { name: 'image', label: 'Main photo', type: 'image', required: true },
  { name: 'gallery', label: 'More photos (close-ups, details, in a room…)', type: 'gallery' }
];

export const CONTENT_TYPES = {
  products: {
    label: 'Shop products',
    singular: 'product',
    reloadsSite: true,
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 120 },
      { name: 'category', label: 'Category', required: true, maxLength: 60, suggestions: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 1000 },
      { name: 'price', label: 'Price', type: 'number', required: true, min: 0.5, step: 0.01, half: true },
      { name: 'stock', label: 'How many are available', type: 'number', required: true, min: 0, step: 1, half: true, initial: 1 },
      { name: 'materials', label: 'Materials', maxLength: 300, placeholder: 'e.g. 100% cotton yarn, wooden button' },
      { name: 'dimensions', label: 'Size', maxLength: 120, placeholder: 'e.g. 20 × 25 cm' },
      { name: 'care', label: 'Care instructions', type: 'textarea', maxLength: 500 },
      ...images
    ],
    summary: (item, money) => `${item.category} · ${money(item.price)} · ${item.stock > 0 ? `${item.stock} in stock` : 'sold out'}`
  },
  artworks: {
    label: 'Portfolio',
    singular: 'artwork',
    reloadsSite: true,
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 120 },
      { name: 'category', label: 'Category', required: true, maxLength: 60, suggestions: true },
      { name: 'description', label: 'Short description', type: 'textarea', required: true, maxLength: 500 },
      { name: 'story', label: 'Story behind the piece', type: 'textarea', maxLength: 2000 },
      { name: 'materials', label: 'Materials', maxLength: 300 },
      { name: 'dimensions', label: 'Size', maxLength: 120, half: true },
      { name: 'year', label: 'Year', maxLength: 10, half: true },
      ...images,
      { name: 'featured', label: 'Feature on the home page', type: 'checkbox' }
    ],
    summary: (item) => `${item.category}${item.featured ? ' · featured on home page' : ''}`
  },
  posts: {
    label: 'Journal',
    singular: 'story',
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 140 },
      { name: 'excerpt', label: 'Summary (shown in lists and link previews)', type: 'textarea', required: true, maxLength: 300 },
      { name: 'body', label: 'Story (leave an empty line between paragraphs)', type: 'textarea', rows: 12, required: true, maxLength: 20000 },
      { name: 'image', label: 'Cover photo', type: 'image', required: true },
      { name: 'published', label: 'Published (untick to keep as a draft)', type: 'checkbox', initial: true }
    ],
    summary: (item) => (item.published ? 'Published' : 'Draft')
  },
  events: {
    label: 'Events',
    singular: 'event',
    fields: [
      { name: 'title', label: 'Event name', required: true, maxLength: 140 },
      { name: 'date', label: 'Start date', type: 'date', required: true, half: true },
      { name: 'endDate', label: 'End date (optional)', type: 'date', half: true },
      { name: 'location', label: 'Location', required: true, maxLength: 200 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 1000 },
      { name: 'link', label: 'Link for more info (optional)', maxLength: 500, placeholder: 'https://…' }
    ],
    summary: (item) => `${item.date}${item.endDate ? ` to ${item.endDate}` : ''} · ${item.location}`
  },
  discounts: {
    label: 'Discount codes',
    singular: 'discount code',
    titleField: 'code',
    fields: [
      { name: 'code', label: 'Code (letters and numbers, e.g. SPRING15)', required: true, maxLength: 30 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: [['percent', 'Percentage off'], ['fixed', 'Fixed amount off']], initial: 'percent', half: true },
      { name: 'amount', label: 'Amount (percent or money)', type: 'number', required: true, min: 0.01, step: 0.01, half: true },
      { name: 'minSubtotal', label: 'Minimum order (0 for none)', type: 'number', min: 0, step: 0.01, half: true, initial: 0 },
      { name: 'expiresAt', label: 'Expires on (optional)', type: 'date', half: true },
      { name: 'active', label: 'Active', type: 'checkbox', initial: true }
    ],
    summary: (item, money) => `${item.type === 'percent' ? `${item.amount}% off` : `${money(item.amount)} off`}` +
      `${item.minSubtotal ? ` orders over ${money(item.minSubtotal)}` : ''} · used ${item.uses || 0}×` +
      `${item.active ? '' : ' · inactive'}${item.expiresAt ? ` · expires ${item.expiresAt}` : ''}`
  }
};
