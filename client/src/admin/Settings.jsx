import { useState } from 'react';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { currencySymbol, DataState, Field, MoneyInput, PageHead, SaveBar, useUnsavedWarning } from './ui.jsx';

export default function Settings() {
  const { data, ...state } = useAdminData('/settings');
  const collections = useAdminData('/collections');
  return (
    <div className="admin-page admin-page-narrow">
      <PageHead title="Settings" />
      <DataState loading={state.loading || collections.loading} error={state.error || collections.error}>
        {data && collections.data && <SettingsForm initial={data} collections={collections.data} />}
      </DataState>
    </div>
  );
}

function SettingsForm({ initial, collections }) {
  const { api } = useAdmin();
  const store = useStore();
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  const set = (patch) => setSettings((prev) => ({ ...prev, ...patch }));
  const text = (name) => ({ value: settings[name] ?? '', onChange: (event) => set({ [name]: event.target.value }) });
  const symbol = currencySymbol(settings.currency || 'usd');
  const updateRate = (index, patch) => set({ shippingRates: settings.shippingRates.map((rate, i) => (i === index ? { ...rate, ...patch } : rate)) });

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        ...settings,
        taxRate: Number(settings.taxRate || 0),
        featuredCollectionId: Number(settings.featuredCollectionId || 0),
        shippingRates: settings.shippingRates.map((rate) => ({ ...rate, price: Number(rate.price || 0), freeOver: Number(rate.freeOver || 0) }))
      };
      const result = await api.put('/settings', body);
      setSettings(result);
      setSaved(result);
      await store.reload();
      setNotice('Settings saved');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <section className="card form">
        <h2 className="card-title" style={{ margin: 0 }}>Store details</h2>
        <div className="form-row">
          <Field label="Store name"><input {...text('storeName')} required maxLength={60} /></Field>
          <Field label="Contact email" hint="Shown on the contact page"><input type="email" {...text('contactEmail')} maxLength={200} /></Field>
        </div>
        <Field label="Tagline" hint="Shown under the store name on the home page"><input {...text('tagline')} maxLength={160} /></Field>
        <Field label="Announcement bar" hint="Leave empty to show your free-shipping threshold instead"><input {...text('announcement')} maxLength={160} /></Field>
        <Field label="Store description" hint="Used by search engines and link previews"><textarea rows={2} {...text('seoDescription')} maxLength={300} /></Field>
        <Field label="Featured collection" hint="Shown on the home page. Without one, the newest products are shown.">
          <select value={settings.featuredCollectionId || 0} onChange={(event) => set({ featuredCollectionId: Number(event.target.value) })}>
            <option value={0}>Newest products</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
          </select>
        </Field>
      </section>

      <section className="card form">
        <h2 className="card-title" style={{ margin: 0 }}>Shipping rates</h2>
        <p className="hint">Customers choose one at checkout. Set "Free over" to give free shipping above an order total.</p>
        {settings.shippingRates.map((rate, index) => (
          <div key={rate.id || index} className="form-row form-row-3" style={{ alignItems: 'end' }}>
            <Field label="Name"><input value={rate.name} onChange={(event) => updateRate(index, { name: event.target.value })} required maxLength={60} /></Field>
            <Field label="Price"><MoneyInput symbol={symbol} value={rate.price} onChange={(price) => updateRate(index, { price })} required /></Field>
            <Field label="Free over (0 = never)"><MoneyInput symbol={symbol} value={rate.freeOver} onChange={(freeOver) => updateRate(index, { freeOver })} /></Field>
            {settings.shippingRates.length > 1 && (
              <button type="button" className="link-button small form-full" style={{ justifySelf: 'start' }} onClick={() => set({ shippingRates: settings.shippingRates.filter((_, i) => i !== index) })}>
                Remove {rate.name || 'rate'}
              </button>
            )}
          </div>
        ))}
        <div><button type="button" className="btn btn-outline btn-small" onClick={() => set({ shippingRates: [...settings.shippingRates, { name: '', price: '', freeOver: 0 }] })}>Add shipping rate</button></div>
      </section>

      <section className="card form">
        <h2 className="card-title" style={{ margin: 0 }}>Currency &amp; tax</h2>
        <div className="form-row">
          <Field label="Currency" hint="3-letter code, e.g. USD, EUR, GBP, INR">
            <input value={(settings.currency || '').toUpperCase()} onChange={(event) => set({ currency: event.target.value.toLowerCase() })} maxLength={3} required />
          </Field>
          <Field label="Tax rate (%)" hint="Added at checkout. Use 0 if prices include tax.">
            <input type="number" min="0" max="50" step="0.01" value={settings.taxRate} onChange={(event) => set({ taxRate: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="card form">
        <h2 className="card-title" style={{ margin: 0 }}>Social links</h2>
        <div className="form-row">
          {['instagram', 'facebook', 'pinterest', 'tiktok'].map((name) => (
            <Field key={name} label={{ instagram: 'Instagram', facebook: 'Facebook', pinterest: 'Pinterest', tiktok: 'TikTok' }[name]}>
              <input type="url" {...text(name)} placeholder="https://" maxLength={300} />
            </Field>
          ))}
        </div>
      </section>

      <SaveBar saving={saving} error={error} />
      {notice && !dirty && <p className="small muted" role="status" style={{ textAlign: 'right', margin: 0 }}>{notice}</p>}
    </form>
  );
}
