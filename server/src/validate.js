// Tiny schema validator so every route checks its input the same way.
//
// schema: { field: { type: 'string' | 'number' | 'integer' | 'boolean' | 'email', required, max, min } }
// Returns { value, error } where value only contains known, cleaned fields.
// With { partial: true } missing fields are skipped (for PATCH-style updates).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validate(body, schema, { partial = false } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const value = {};

  for (const [field, rule] of Object.entries(schema)) {
    let raw = input[field];
    const label = rule.label || field;

    if (raw === undefined || raw === null || raw === '') {
      if (rule.required && !partial) return { error: `${label} is required` };
      if (!partial && rule.default !== undefined) value[field] = rule.default;
      continue;
    }

    switch (rule.type) {
      case 'string':
      case 'email': {
        if (typeof raw !== 'string') return { error: `${label} must be text` };
        raw = raw.trim();
        if (rule.required && !raw) return { error: `${label} is required` };
        if (rule.max && raw.length > rule.max) return { error: `${label} must be at most ${rule.max} characters` };
        if (rule.type === 'email' && !EMAIL.test(raw)) return { error: `${label} must be a valid email address` };
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
      default:
        throw new Error(`Unknown rule type ${rule.type}`);
    }

    value[field] = raw;
  }

  return { value };
}

export const artworkSchema = {
  title: { type: 'string', required: true, max: 120 },
  category: { type: 'string', required: true, max: 60 },
  description: { type: 'string', required: true, max: 500 },
  story: { type: 'string', max: 2000, default: '' },
  image: { type: 'string', required: true, max: 1000 },
  featured: { type: 'boolean', default: false }
};

export const productSchema = {
  title: { type: 'string', required: true, max: 120 },
  category: { type: 'string', required: true, max: 60 },
  description: { type: 'string', required: true, max: 1000 },
  price: { type: 'number', required: true, min: 0.5, max: 100000 },
  stock: { type: 'integer', required: true, min: 0, max: 10000 },
  image: { type: 'string', required: true, max: 1000 }
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
  note: { type: 'string', max: 1000, default: '', label: 'Note' }
};
