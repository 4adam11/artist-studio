import { randomBytes } from 'node:crypto';

// Small schema validator so every route checks its input the same way.
//
// Rule types: string, email, url, date (YYYY-MM-DD), enum, number, integer,
// boolean, urlList, stringList, idList. Options: required, max, min,
// maxItems, pattern, values (enum), default, label, uppercase.
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

function checkList(raw, rule, label) {
  // Lists of text can also be sent as one comma-separated string ("a, b").
  const list = rule.type === 'stringList' && typeof raw === 'string' ? raw.split(',') : raw;
  if (!Array.isArray(list)) return { error: `${label} must be a list` };
  if (list.length > (rule.maxItems || 20)) return { error: `${label} can have at most ${rule.maxItems || 20} items` };

  const items = [];
  for (const item of list) {
    if (rule.type === 'idList') {
      if (!Number.isInteger(item) || item < 1) return { error: `${label} must be a list of ids` };
      items.push(item);
      continue;
    }
    const itemRule = rule.type === 'urlList' ? { type: 'url', max: 1000 } : { type: 'string', max: rule.itemMax || 60 };
    const result = checkString(item, itemRule, label);
    if (result.error) return result;
    if (result.value && !items.includes(result.value)) items.push(result.value);
  }
  return { value: items };
}

export function validate(body, schema, { partial = false } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const value = {};

  for (const [field, rule] of Object.entries(schema)) {
    let raw = input[field];
    const label = rule.label || field;

    if (raw === undefined || raw === null || (raw === '' && rule.type !== 'string' && rule.type !== 'stringList')) {
      if (rule.required && !partial) return { error: `${label} is required` };
      // An empty optional field in an update means "clear it".
      if (raw === '' && partial && !rule.required && (TEXT_TYPES.has(rule.type) || rule.clearable)) value[field] = rule.type === 'number' ? null : '';
      else if (raw === null && partial && rule.clearable) value[field] = null;
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
        if (rule.type === 'number') raw = Math.round(raw * 100) / 100;
        break;
      }
      case 'boolean':
        if (typeof raw !== 'boolean') return { error: `${label} must be true or false` };
        break;
      case 'urlList':
      case 'stringList':
      case 'idList': {
        const result = checkList(raw, rule, label);
        if (result.error) return result;
        raw = result.value;
        break;
      }
      default:
        throw new Error(`Unknown rule type ${rule.type}`);
    }

    value[field] = raw;
  }

  return { value };
}

// "Summer Linen Dress!" -> "summer-linen-dress"
export function slugify(text) {
  return String(text)
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

const HANDLE = { type: 'string', max: 80, pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMessage: 'URL handle can only use lowercase letters, numbers and dashes', label: 'URL handle' };

// ---- Products ----

export const PRODUCT_STATUSES = ['active', 'draft', 'archived'];

const productSchema = {
  title: { type: 'string', required: true, max: 150, label: 'Title' },
  handle: HANDLE,
  description: { type: 'string', max: 20000, default: '', label: 'Description' },
  productType: { type: 'string', max: 60, default: '', label: 'Product type' },
  vendor: { type: 'string', max: 60, default: '', label: 'Vendor' },
  tags: { type: 'stringList', maxItems: 30, default: [], label: 'Tags' },
  status: { type: 'enum', values: PRODUCT_STATUSES, default: 'draft', label: 'Status' },
  images: { type: 'urlList', maxItems: 20, default: [], label: 'Images' }
};

const variantSchema = {
  price: { type: 'number', required: true, min: 0, max: 1000000, label: 'Price' },
  compareAtPrice: { type: 'number', min: 0, max: 1000000, label: 'Compare-at price' },
  sku: { type: 'string', max: 60, default: '', label: 'SKU' },
  stock: { type: 'integer', required: true, min: 0, max: 1000000, label: 'Stock' }
};

const VARIANT_ID = /^[a-f0-9]{10}$/;
export const newVariantId = () => randomBytes(5).toString('hex');

// Options are things like Size or Colour; every combination of their values
// is a variant with its own price, SKU and stock. A product without options
// has exactly one variant.
export function validateProduct(body, { partial = false } = {}) {
  const base = validate(body, productSchema, { partial });
  if (base.error) return base;
  const value = base.value;
  if (partial && body?.options === undefined && body?.variants === undefined) return { value };

  const rawOptions = Array.isArray(body?.options) ? body.options : [];
  if (rawOptions.length > 3) return { error: 'A product can have at most 3 options' };
  const options = [];
  for (const raw of rawOptions) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    if (!name || name.length > 30) return { error: 'Each option needs a name of up to 30 characters' };
    if (options.some((option) => option.name.toLowerCase() === name.toLowerCase())) return { error: `The option "${name}" is listed twice` };
    const values = checkList(raw?.values ?? [], { type: 'stringList', maxItems: 50, itemMax: 50 }, `${name} values`);
    if (values.error) return values;
    if (!values.value.length) return { error: `Add at least one value for ${name}` };
    options.push({ name, values: values.value });
  }

  const rawVariants = Array.isArray(body?.variants) ? body.variants : [];
  if (!rawVariants.length) return { error: 'A product needs at least one variant with a price' };
  if (rawVariants.length > 100) return { error: 'A product can have at most 100 variants' };
  if (!options.length && rawVariants.length !== 1) return { error: 'A product without options has exactly one variant' };

  const variants = [];
  const seen = new Set();
  for (const raw of rawVariants) {
    const fields = validate(raw, variantSchema);
    if (fields.error) return fields;
    const optionValues = Array.isArray(raw?.options) ? raw.options.map((v) => String(v).trim()) : [];
    if (optionValues.length !== options.length || optionValues.some((v, i) => !options[i].values.includes(v))) {
      return { error: 'Each variant must use one value from every option' };
    }
    const key = optionValues.join(' / ');
    if (seen.has(key)) return { error: `The variant "${key}" is listed twice` };
    seen.add(key);
    if (fields.value.compareAtPrice !== undefined && fields.value.compareAtPrice <= fields.value.price) delete fields.value.compareAtPrice;
    variants.push({
      id: VARIANT_ID.test(raw?.id) ? raw.id : newVariantId(),
      options: optionValues,
      compareAtPrice: null,
      ...fields.value
    });
  }

  return { value: { ...value, options, variants } };
}

// ---- Other content ----

export const collectionSchema = {
  title: { type: 'string', required: true, max: 100, label: 'Title' },
  handle: HANDLE,
  description: { type: 'string', max: 2000, default: '', label: 'Description' },
  image: { type: 'url', max: 1000, default: '', label: 'Image' },
  productIds: { type: 'idList', maxItems: 500, default: [], label: 'Products' }
};

export const pageSchema = {
  title: { type: 'string', required: true, max: 100, label: 'Title' },
  handle: HANDLE,
  body: { type: 'string', max: 50000, default: '', label: 'Content' },
  published: { type: 'boolean', default: true }
};

export const DISCOUNT_TYPES = ['percent', 'fixed', 'shipping'];

export const discountSchema = {
  code: {
    type: 'string', required: true, max: 30, uppercase: true,
    pattern: /^[A-Z0-9_-]{3,30}$/, patternMessage: 'Codes use 3–30 letters, numbers, - or _', label: 'Code'
  },
  type: { type: 'enum', required: true, values: DISCOUNT_TYPES, label: 'Type' },
  amount: { type: 'number', min: 0, max: 100000, default: 0, label: 'Amount' },
  minSubtotal: { type: 'number', min: 0, max: 100000, default: 0, label: 'Minimum order' },
  usageLimit: { type: 'integer', min: 0, max: 1000000, default: 0, label: 'Usage limit' },
  expiresAt: { type: 'date', default: '', label: 'End date' },
  active: { type: 'boolean', default: true }
};

const shippingRateSchema = {
  name: { type: 'string', required: true, max: 60, label: 'Shipping rate name' },
  price: { type: 'number', required: true, min: 0, max: 10000, label: 'Shipping price' },
  freeOver: { type: 'number', min: 0, max: 1000000, default: 0, label: 'Free over' }
};

export const settingsSchema = {
  storeName: { type: 'string', max: 60, label: 'Store name' },
  tagline: { type: 'string', max: 160, label: 'Tagline' },
  announcement: { type: 'string', max: 160, label: 'Announcement' },
  seoDescription: { type: 'string', max: 300, label: 'Store description' },
  currency: { type: 'string', max: 3, pattern: /^[A-Za-z]{3}$/, patternMessage: 'Currency must be a 3-letter code like USD', label: 'Currency' },
  taxRate: { type: 'number', min: 0, max: 50, label: 'Tax rate' },
  contactEmail: { type: 'email', max: 200, label: 'Contact email' },
  instagram: { type: 'url', max: 300, label: 'Instagram' },
  facebook: { type: 'url', max: 300, label: 'Facebook' },
  pinterest: { type: 'url', max: 300, label: 'Pinterest' },
  tiktok: { type: 'url', max: 300, label: 'TikTok' },
  featuredCollectionId: { type: 'integer', min: 0, label: 'Featured collection' }
};

export function validateSettings(body) {
  const base = validate(body, settingsSchema, { partial: true });
  if (base.error) return base;
  const value = base.value;
  if (value.currency) value.currency = value.currency.toLowerCase();

  if (body?.shippingRates !== undefined) {
    if (!Array.isArray(body.shippingRates) || !body.shippingRates.length) return { error: 'Add at least one shipping rate' };
    if (body.shippingRates.length > 10) return { error: 'You can have at most 10 shipping rates' };
    const rates = [];
    for (const raw of body.shippingRates) {
      const rate = validate(raw, shippingRateSchema);
      if (rate.error) return rate;
      rates.push({ id: VARIANT_ID.test(raw?.id) ? raw.id : newVariantId(), ...rate.value });
    }
    value.shippingRates = rates;
  }
  return { value };
}

// ---- Customer forms ----

export const CONTACT_SUBJECTS = ['General question', 'Order help', 'Custom order', 'Wholesale', 'Other'];

export const contactSchema = {
  name: { type: 'string', required: true, max: 80, label: 'Name' },
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  subject: { type: 'enum', values: CONTACT_SUBJECTS, default: 'General question', label: 'Subject' },
  orderNumber: { type: 'string', max: 20, default: '', label: 'Order number' },
  message: { type: 'string', required: true, max: 5000, label: 'Message' }
};

export const checkoutSchema = {
  email: { type: 'email', required: true, max: 200, label: 'Email' },
  firstName: { type: 'string', required: true, max: 60, label: 'First name' },
  lastName: { type: 'string', required: true, max: 60, label: 'Last name' },
  phone: { type: 'string', max: 40, default: '', label: 'Phone' },
  line1: { type: 'string', required: true, max: 120, label: 'Address' },
  line2: { type: 'string', max: 120, default: '', label: 'Apartment, suite, etc.' },
  city: { type: 'string', required: true, max: 80, label: 'City' },
  region: { type: 'string', max: 80, default: '', label: 'State / region' },
  postalCode: { type: 'string', required: true, max: 20, label: 'Postal code' },
  country: { type: 'string', required: true, max: 60, label: 'Country' },
  note: { type: 'string', max: 1000, default: '', label: 'Order note' },
  discountCode: { type: 'string', max: 30, default: '', uppercase: true, label: 'Discount code' },
  shippingRateId: { type: 'string', max: 20, default: '', label: 'Shipping method' },
  subscribe: { type: 'boolean', default: false }
};

export const emailSchema = {
  email: { type: 'email', required: true, max: 200, label: 'Email' }
};
