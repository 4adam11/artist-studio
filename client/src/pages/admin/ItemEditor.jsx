import { useState } from 'react';
import { CONTENT_TYPES } from './contentTypes.js';

function emptyValues(fields) {
  return Object.fromEntries(fields.map((field) => [
    field.name,
    field.initial ?? (field.type === 'checkbox' ? false : field.type === 'gallery' ? [] : '')
  ]));
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
      payload[field.name] = field.type === 'number' ? (value === '' ? '' : Number(value)) : value;
    }
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  const listId = `${type}-categories`;

  function renderField(field) {
    if (field.type === 'image') {
      return <ImageField key={field.name} label={field.label} value={values[field.name]} onChange={(url) => set(field.name, url)} admin={admin} />;
    }
    if (field.type === 'gallery') {
      return <GalleryField key={field.name} label={field.label} value={values[field.name] || []} onChange={(list) => set(field.name, list)} admin={admin} />;
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
      maxLength: field.maxLength,
      placeholder: field.placeholder
    };
    let control;
    if (field.type === 'textarea') control = <textarea rows={field.rows || 3} {...common} />;
    else if (field.type === 'select') {
      control = <select {...common}>{field.options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>;
    } else {
      control = (
        <input
          type={field.type || 'text'}
          min={field.min}
          step={field.step}
          list={field.suggestions ? listId : undefined}
          {...common}
        />
      );
    }
    return <label key={field.name}>{field.label}{control}</label>;
  }

  // Put "half width" fields side by side.
  const rows = [];
  for (const field of fields) {
    const last = rows[rows.length - 1];
    if (field.half && Array.isArray(last) && last.length === 1) last.push(field);
    else rows.push(field.half ? [field] : field);
  }

  return (
    <form className="form-card editor" onSubmit={handleSubmit}>
      <h3>{item?.id ? `Edit ${singular}` : `New ${singular}`}</h3>
      <datalist id={listId}>
        {categories.map((category) => <option key={category} value={category} />)}
      </datalist>

      {rows.map((row, index) => (Array.isArray(row)
        ? <div key={index} className="form-row">{row.map(renderField)}</div>
        : renderField(row)))}

      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="actions actions-left">
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function useUpload(admin) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function upload(files) {
    setUploading(true);
    setError(null);
    const urls = [];
    try {
      for (const file of files) urls.push((await admin.uploadImage(file)).url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
    return urls;
  }

  return { upload, uploading, error };
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

function ImageField({ label, value, onChange, admin }) {
  const { upload, uploading, error } = useUpload(admin);

  async function handleFile(event) {
    const [url] = await upload([...event.target.files].slice(0, 1));
    if (url) onChange(url);
    event.target.value = '';
  }

  return (
    <fieldset className="image-field">
      <legend>{label}</legend>
      {value && <img src={value} alt="Preview" className="image-preview" />}
      <label>
        Upload a photo (JPG, PNG, WebP or GIF, up to 8 MB)
        <input type="file" accept={ACCEPT} onChange={handleFile} disabled={uploading} />
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

function GalleryField({ label, value, onChange, admin }) {
  const { upload, uploading, error } = useUpload(admin);

  async function handleFiles(event) {
    const room = 8 - value.length;
    const urls = await upload([...event.target.files].slice(0, room));
    if (urls.length) onChange([...value, ...urls]);
    event.target.value = '';
  }

  return (
    <fieldset className="image-field">
      <legend>{label}</legend>
      {value.length > 0 && (
        <div className="gallery-editor">
          {value.map((url, index) => (
            <figure key={url + index}>
              <img src={url} alt={`Extra photo ${index + 1}`} />
              <button type="button" className="chip chip-danger btn-small" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>✕</button>
            </figure>
          ))}
        </div>
      )}
      {value.length < 8 ? (
        <label>
          Add photos (up to {8 - value.length} more)
          <input type="file" accept={ACCEPT} multiple onChange={handleFiles} disabled={uploading} />
        </label>
      ) : <p className="muted small">That's the maximum of 8 extra photos.</p>}
      {uploading && <p className="muted small">Uploading…</p>}
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
