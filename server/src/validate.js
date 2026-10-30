// Tiny schema validator so every route checks its input the same way.
//
// Rule types: string, email, url, date (YYYY-MM-DD), enum, number, integer,
// boolean, urlList (array of urls). Options: required, max, min, maxItems,
// pattern, values (enum), default, label, uppercase.
// Returns { value, error } where value only contains known, cleaned fields.
// With { partial: true } missing fields are skipped (for updates).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only web links or site-relative paths, never javascript: or data: URLs.
const URL = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_TYPES = new Set(['email', 'url', 'date', 'enum']);

function checkString(raw, rule, label) {
  if (typeof raw !== 'string') return { error: `${label} must be text` };
  let value = raw.trim();
  if (rule.uppercase) value = value.toUpperCase();
  if (rule.required && !value) return { error: `${label} is required` };
  if (rule.max && value.length > rule.max) return { error: `${label} must be at most ${rule.max} characters` };
  if (!value) return { value };
  if (rule.type === 'email' && !EMAIL.test(value)) return { error: `${label} must be a valid email address` };
  if (rule.type === 'url' && !URL.test(value)) return { error: `${label} must be a link starting with https:// or /` };
  if (rule.type === 'date' && (!DATE.test(value) || Number.isNaN(Date.parse(value)))) return { error: `${label} must be a date` };
  if (rule.type === 'enum' && !rule.values.includes(value)) return { error: `${label} must be one of: ${rule.values.join(', ')}` };
  if (rule.pattern && !rule.pattern.test(value)) return { error: rule.patternMessage || `${label} is not in the right format` };
  return { value };
}

export function validate(body, schema, { partial = false } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const value = {};

  for (const [field, rule] of Object.entries(schema)) {
    let raw = input[field];
    const label = rule.label || field;

    if (raw === undefined || raw === null || (raw === '' && rule.type !== 'string')) {
      if (rule.required && !partial) return { error: `${label} is required` };
      // An empty optional text field in an update means "clear it".
      if (raw === '' && partial && TEXT_TYPES.has(rule.type) && !rule.required) value[field] = '';
      else if (!partial && rule.default !== undefined) value[field] = structuredClone(rule.default);
      continue;
    }

    switch (rule.type) {
      case 'string':
      case 'email':
      case 'url':
      case 'date':
      case 'enum': {
        const result = checkString(raw, rule, label);
        if (result.error) return result;
        raw = result.value;
        break;
      }
      case 'number':
      case 'integer': {
        raw = Number(raw);
        if (!Number.isFinite(raw)) return { error: `${label} must be a number` };
        if (rule.type === 'integer' && !Number.isInteger(raw)) return { error: `${label} must be a whole number` };
        if (rule.min !== undefined && raw < rule.min) return { error: `${label} must be at least ${rule.min}` };
        if (rule.max !== undefined && raw > rule.max) return { error: `${label} must be at most ${rule.max}` };
        break;
      }
      case 'boolean':
        if (typeof raw !== 'boolean') return { error: `${label} must be true or false` };
        break;
      case 'urlList': {
        if (!Array.isArray(raw)) return { error: `${label} must be a list of links` };
        if (raw.length > (rule.maxItems || 10)) return { error: `${label} can have at most ${rule.maxItems || 10} items` };
        const items = [];
        for (const item of raw) {
          const result = checkString(item, { type: 'url', max: 1000 }, label);
          if (result.error) return result;
          if (result.value) items.push(result.value);
        }
        raw = items;
        break;
      }
      default:
        throw new Error(`Unknown rule type ${rule.type}`);
    }

    value[field] = raw;
  }

  return { value };
}

const gallery = { type: 'urlList', maxItems: 8, default: [], label: 'Extra photos' };

export const artworkSchema = {
  title: { type: 'string', required: true, max: 120 },
  category: { type: 'string', required: true, max: 60 },
  description: { type: 'string', required: true, max: 500 },
  story: { type: 'string', max: 2000, default: '' },
  image: { type: 'url', required: true, max: 1000, label: 'Image' },
  gallery,
  materials: { type: 'string', max: 300, default: '' },
  dimensions: { type: 'string', max: 120, default: '' },
  year: { type: 'string', max: 10, default: '' },
  featured: { type: 'boolean', default: false }
};

export const productSchema = {
  title: { type: 'string', required: true, max: 120 },
  category: { type: 'string', required: true, max: 60 },
  description: { type: 'string', required: true, max: 1000 },
  price: { type: 'number', required: true, min: 0.5, max: 100000 },
  stock: { type: 'integer', required: true, min: 0, max: 10000 },
  image: { type: 'url', required: true, max: 1000, label: 'Image' },
  gallery,
  materials: { type: 'string', max: 300, default: '' },
  dimensions: { type: 'string', max: 120, default: '' },
  care: { type: 'string', max: 500, default: '' }
};

export const postSchema = {
  title: { type: 'string', required: true, max: 140 },
  excerpt: { type: 'string', required: true, max: 300, label: 'Summary' },
  body: { type: 'string', required: true, max: 20000 },
  image: { type: 'url', required: true, max: 1000, label: 'Cover image' },
  published: { type: 'boolean', default: true }
};

export const eventSchema = {
  title: { type: 'string', required: true, max: 140 },
  date: { type: 'date', required: true, label: 'Start date' },
  endDate: { type: 'date', default: '', label: 'End date' },
  location: { type: 'string', required: true, max: 200 },
  description: { type: 'string', max: 1000, default: '' },
  link: { type: 'url', max: 500, default: '' }
};

export const discountSchema = {
  code: {
    type: 'string', required: true, max: 30, uppercase: true,
    pattern: /^[A-Z0-9_-]{3,30}$/, patternMessage: 'Codes use 3–30 letters, numbers, - or _'
  },
  type: { type: 'enum', required: true, values: ['percent', 'fixed'] },
  amount: { type: 'number', required: true, min: 0.01, max: 100000 },
  minSubtotal: { type: 'number', min: 0, max: 100000, default: 0, label: 'Minimum order' },
  expiresAt: { type: 'date', default: '', label: 'Expiry date' },
  active: { type: 'boolean', default: true }
};

export const settingsSchema = {
  announcement: { type: 'string', max: 160 },
  siteDescription: { type: 'string', max: 300 },
  shippingFlat: { type: 'number', min: 0, max: 1000, label: 'Shipping cost' },
  freeShippingOver: { type: 'number', min: 0, max: 100000, label: 'Free shipping threshold' },
  processingTime: { type: 'string', max: 160 },
  shipsTo: { type: 'string', max: 160 },
  contactEmail: { type: 'email', max: 200 },
  instagram: { type: 'url', max: 300 },
  facebook: { type: 'url', max: 300 },
  pinterest: { type: 'url', max: 300 },
  etsy: { type: 'url', max: 300 }
};

export const commentSchema = {
  name: { type: 'string', required: true, max: 60, label: 'Name' },
  message: { type: 'string', required: true, max: 1000, label: 'Message' }
};

export const contactSchema = {
  name: { type: 'string', required: true, max: 80, label: 'Name' },
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  message: { type: 'string', required: true, max: 5000, label: 'Message' }
};

export const checkoutSchema = {
  name: { type: 'string', required: true, max: 80, label: 'Name' },
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  phone: { type: 'string', max: 40, default: '', label: 'Phone' },
  line1: { type: 'string', required: true, max: 120, label: 'Address' },
  line2: { type: 'string', max: 120, default: '', label: 'Address line 2' },
  city: { type: 'string', required: true, max: 80, label: 'City' },
  region: { type: 'string', max: 80, default: '', label: 'State / region' },
  postalCode: { type: 'string', required: true, max: 20, label: 'Postal code' },
  country: { type: 'string', required: true, max: 60, label: 'Country' },
  note: { type: 'string', max: 1000, default: '', label: 'Note' },
  discountCode: { type: 'string', max: 30, default: '', uppercase: true, label: 'Discount code' }
};

export const commissionSchema = {
  name: { type: 'string', required: true, max: 80, label: 'Name' },
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  type: { type: 'string', required: true, max: 60, label: 'Type of piece' },
  size: { type: 'string', max: 120, default: '', label: 'Size' },
  colors: { type: 'string', max: 200, default: '', label: 'Colours' },
  budget: { type: 'string', max: 60, default: '', label: 'Budget' },
  deadline: { type: 'date', default: '', label: 'Needed by' },
  details: { type: 'string', required: true, max: 5000, label: 'Details' }
};

export const reviewSchema = {
  name: { type: 'string', required: true, max: 60, label: 'Name' },
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  rating: { type: 'integer', required: true, min: 1, max: 5, label: 'Rating' },
  title: { type: 'string', max: 100, default: '', label: 'Title' },
  body: { type: 'string', required: true, max: 2000, label: 'Review' }
};

export const emailSchema = {
  email: { type: 'email', required: true, max: 200, label: 'Email' }
};
