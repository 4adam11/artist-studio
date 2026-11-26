import { cloneElement, isValidElement, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { useAdmin } from './AdminContext.jsx';

export function PageHead({ title, back, badges, children }) {
  return (
    <>
      {back && <Link to={back[0]} className="back-link">← {back[1]}</Link>}
      <div className="admin-head">
        <div className="admin-head-title">
          <h1>{title}</h1>
          {badges}
        </div>
        {children && <div className="button-row" style={{ margin: 0 }}>{children}</div>}
      </div>
    </>
  );
}

export function DataState({ loading, error, reload, children }) {
  if (error) return <ErrorNotice message={error} onRetry={reload} />;
  if (loading) return <Loading />;
  return children;
}

export function Badge({ tone, children }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{children}</span>;
}

export function PaymentBadge({ status }) {
  return status === 'paid' ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Payment pending</Badge>;
}

export function FulfillmentBadge({ status }) {
  return status === 'fulfilled' ? <Badge>Fulfilled</Badge> : <Badge tone="warning">Unfulfilled</Badge>;
}

export function ProductStatusBadge({ status }) {
  const tones = { active: 'success', draft: undefined, archived: undefined };
  return <Badge tone={tones[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

// A labelled form control. The hint sits outside the label (so it isn't read
// as part of the field's name) and is linked to the control instead.
export function Field({ label, hint, children }) {
  const hintId = useId();
  const control = hint && isValidElement(children) && typeof children.type === 'string'
    ? cloneElement(children, { 'aria-describedby': hintId })
    : children;
  return (
    <div className="field-group">
      <label className="field">
        <span>{label}</span>
        {control}
      </label>
      {hint && <p className="hint" id={hintId}>{hint}</p>}
    </div>
  );
}

export function MoneyInput({ value, onChange, symbol, ...props }) {
  return (
    <div className="input-prefix">
      <span>{symbol}</span>
      <input type="number" inputMode="decimal" min="0" step="0.01" value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}

// "$" for USD, "€" for EUR… used as the prefix of price inputs.
export function currencySymbol(currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() })
      .formatToParts(0).find((part) => part.type === 'currency')?.value || '';
  } catch {
    return currency.toUpperCase();
  }
}

// Upload, reorder and remove images. The first image is the main one.
export function ImageManager({ images, onChange, max = 20, single = false }) {
  const { api } = useAdmin();
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState('');

  async function handleFiles(event) {
    const files = [...event.target.files].slice(0, max - images.length);
    event.target.value = '';
    setError(null);
    setUploading(files.length);
    const added = [];
    for (const file of files) {
      try {
        added.push((await api.upload(file)).url);
      } catch (uploadError) {
        setError(uploadError.message);
      }
      setUploading((count) => count - 1);
    }
    if (added.length) onChange(single ? added.slice(0, 1) : [...images, ...added]);
  }

  const move = (index, direction) => {
    const next = [...images];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="image-list">
        {images.map((image, index) => (
          <div key={image + index} className="image-tile">
            <img src={image} alt={`Image ${index + 1}`} />
            {index === 0 && !single && <span className="image-tile-main">Main</span>}
            <div className="image-tile-actions">
              {!single && index > 0 && <button type="button" onClick={() => move(index, -1)} aria-label={`Move image ${index + 1} earlier`}>←</button>}
              <button type="button" onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label={`Remove image ${index + 1}`}>✕</button>
              {!single && index < images.length - 1 && <button type="button" onClick={() => move(index, 1)} aria-label={`Move image ${index + 1} later`}>→</button>}
            </div>
          </div>
        ))}
        {images.length < max && (
          <label className="image-add">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!single} onChange={handleFiles} disabled={uploading > 0} />
            {uploading > 0 ? 'Uploading…' : single ? 'Upload image' : 'Add images'}
            <span className="hint">JPG, PNG, WebP</span>
          </label>
        )}
      </div>
      <div className="image-url">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Or paste an image URL" aria-label="Image URL" />
        <button
          type="button"
          className="btn btn-outline btn-small"
          disabled={!url.trim()}
          onClick={() => { onChange(single ? [url.trim()] : [...images, url.trim()]); setUrl(''); }}
        >
          Add
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SaveBar({ saving, error, onDelete, deleteLabel = 'Delete', submitLabel = 'Save' }) {
  return (
    <div className="save-bar">
      {error && <p className="error-text" role="alert">{error}</p>}
      {onDelete && <button type="button" className="btn btn-danger-outline" onClick={onDelete}>{deleteLabel}</button>}
      <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
    </div>
  );
}

// Warn before leaving a form with unsaved changes.
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
