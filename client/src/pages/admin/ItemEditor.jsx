import { useState } from 'react';
import { CONTENT_TYPES } from './contentTypes.js';

function emptyValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === 'checkbox' ? false : field.name === 'stock' ? 1 : '']));
}

export default function ItemEditor({ type, item, categories, admin, onSave, onCancel }) {
  const { fields, singular } = CONTENT_TYPES[type];
  const [values, setValues] = useState(() => ({ ...emptyValues(fields), ...item }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {};
    for (const field of fields) {
      const value = values[field.name];
      payload[field.name] = field.type === 'number' ? Number(value) : value;
    }
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  const listId = `${type}-categories`;

  return (
    <form className="form-card editor" onSubmit={handleSubmit}>
      <h3>{item?.id ? `Edit ${singular}` : `New ${singular}`}</h3>
      <datalist id={listId}>
        {categories.map((category) => <option key={category} value={category} />)}
      </datalist>

      {fields.map((field) => {
        if (field.type === 'image') {
          return <ImageField key={field.name} value={values.image} onChange={(url) => set('image', url)} admin={admin} />;
        }
        if (field.type === 'checkbox') {
          return (
            <label key={field.name} className="checkbox">
              <input type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => set(field.name, event.target.checked)} />
              {field.label}
            </label>
          );
        }
        const common = {
          value: values[field.name] ?? '',
          onChange: (event) => set(field.name, event.target.value),
          required: field.required,
          maxLength: field.maxLength
        };
        return (
          <label key={field.name}>
            {field.label}
            {field.type === 'textarea' ? (
              <textarea rows={3} {...common} />
            ) : (
              <input
                type={field.type || 'text'}
                min={field.min}
                step={field.step}
                list={field.suggestions ? listId : undefined}
                {...common}
              />
            )}
          </label>
        );
      })}

      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="actions actions-left">
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ImageField({ value, onChange, admin }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await admin.uploadImage(file);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <fieldset className="image-field">
      <legend>Image</legend>
      {value && <img src={value} alt="Preview" className="image-preview" />}
      <label>
        Upload a photo (JPG, PNG, WebP or GIF, up to 8 MB)
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} disabled={uploading} />
      </label>
      {uploading && <p className="muted small">Uploading…</p>}
      <label>
        …or paste an image address
        <input type="text" value={value || ''} onChange={(event) => onChange(event.target.value)} required placeholder="https://…" />
      </label>
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
