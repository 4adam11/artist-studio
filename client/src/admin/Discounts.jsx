import { useState } from 'react';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { Badge, currencySymbol, DataState, Field, MoneyInput, PageHead } from './ui.jsx';

const EMPTY = { code: '', type: 'percent', amount: '', minSubtotal: '', usageLimit: '', expiresAt: '', active: true };

export default function Discounts() {
  const { data: discounts, reload, ...state } = useAdminData('/discounts');
  const { api } = useAdmin();
  const { money } = useStore();
  const [editing, setEditing] = useState(null);

  const describe = (d) => {
    const amount = d.type === 'percent' ? `${d.amount}% off` : d.type === 'fixed' ? `${money(d.amount)} off` : 'Free shipping';
    return [amount, d.minSubtotal ? `orders over ${money(d.minSubtotal)}` : 'all orders', d.expiresAt && `ends ${d.expiresAt}`].filter(Boolean).join(' · ');
  };

  async function remove(discount) {
    if (!window.confirm(`Delete the code ${discount.code}?`)) return;
    await api.remove(`/discounts/${discount.id}`);
    reload();
  }

  return (
    <div className="admin-page admin-page-narrow">
      <PageHead title="Discounts">
        {!editing && <button type="button" className="btn btn-small" onClick={() => setEditing(EMPTY)}>Create discount</button>}
      </PageHead>
      {editing && <DiscountForm key={editing.id || 'new'} initial={editing} onDone={() => { setEditing(null); reload(); }} />}
      <DataState {...state} reload={reload}>
        <section className="card card-flush">
          {discounts?.length ? (
            <table className="table">
              <thead><tr><th>Code</th><th>Details</th><th>Used</th><th>Status</th><th /></tr></thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id}>
                    <td className="mono">{discount.code}</td>
                    <td className="muted">{describe(discount)}</td>
                    <td className="muted">{discount.uses || 0}{discount.usageLimit ? ` / ${discount.usageLimit}` : ''}</td>
                    <td>{discount.active ? <Badge tone="success">Active</Badge> : <Badge>Off</Badge>}</td>
                    <td className="num">
                      <button type="button" className="link-button small" onClick={() => { setEditing(discount); window.scrollTo(0, 0); }}>Edit</button>{' · '}
                      <button type="button" className="link-button small" onClick={() => remove(discount)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>No discount codes yet.</p>}
        </section>
      </DataState>
    </div>
  );
}

function DiscountForm({ initial, onDone }) {
  const { api } = useAdmin();
  const { settings } = useStore();
  const [discount, setDiscount] = useState({ ...initial, minSubtotal: initial.minSubtotal || '', usageLimit: initial.usageLimit || '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setDiscount((prev) => ({ ...prev, ...patch }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      code: discount.code,
      type: discount.type,
      amount: discount.type === 'shipping' ? 0 : Number(discount.amount),
      minSubtotal: Number(discount.minSubtotal || 0),
      usageLimit: Number(discount.usageLimit || 0),
      expiresAt: discount.expiresAt,
      active: discount.active
    };
    try {
      if (initial.id) await api.put(`/discounts/${initial.id}`, body);
      else await api.post('/discounts', body);
      onDone();
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={save} style={{ marginBottom: '1rem' }}>
      <h2 className="card-title" style={{ margin: 0 }}>{initial.id ? `Edit ${initial.code}` : 'New discount code'}</h2>
      <div className="form-row">
        <Field label="Code" hint="Customers enter this at checkout">
          <input value={discount.code} onChange={(event) => set({ code: event.target.value.toUpperCase() })} required maxLength={30} placeholder="SUMMER15" className="mono" />
        </Field>
        <Field label="Type">
          <select value={discount.type} onChange={(event) => set({ type: event.target.value })}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="shipping">Free shipping</option>
          </select>
        </Field>
      </div>
      <div className="form-row">
        {discount.type === 'percent' && <Field label="Percentage"><input type="number" min="1" max="100" step="1" value={discount.amount} onChange={(event) => set({ amount: event.target.value })} required /></Field>}
        {discount.type === 'fixed' && <Field label="Amount"><MoneyInput symbol={currencySymbol(settings.currency)} value={discount.amount} onChange={(amount) => set({ amount })} required /></Field>}
        <Field label="Minimum order (optional)"><MoneyInput symbol={currencySymbol(settings.currency)} value={discount.minSubtotal} onChange={(minSubtotal) => set({ minSubtotal })} /></Field>
      </div>
      <div className="form-row">
        <Field label="Total uses allowed (optional)"><input type="number" min="0" step="1" value={discount.usageLimit} onChange={(event) => set({ usageLimit: event.target.value })} placeholder="Unlimited" /></Field>
        <Field label="End date (optional)"><input type="date" value={discount.expiresAt} onChange={(event) => set({ expiresAt: event.target.value })} /></Field>
      </div>
      <label className="checkbox-inline"><input type="checkbox" checked={discount.active} onChange={(event) => set({ active: event.target.checked })} />Active</label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="button-row" style={{ margin: 0 }}>
        <button type="submit" className="btn btn-small" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-outline btn-small" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
