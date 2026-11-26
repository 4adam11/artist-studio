import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { matchesQuery } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { DataState, Field, ImageManager, PageHead, SaveBar, useUnsavedWarning } from './ui.jsx';

export function CollectionList() {
  const { data: collections, ...state } = useAdminData('/collections');
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <PageHead title="Collections">
        <Link to="/admin/collections/new" className="btn btn-small">Create collection</Link>
      </PageHead>
      <DataState {...state}>
        <section className="card card-flush">
          {collections?.length ? (
            <table className="table">
              <thead><tr><th>Title</th><th>Products</th><th>Address</th></tr></thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id} className="is-link" onClick={() => navigate(`/admin/collections/${collection.id}`)}>
                    <td><Link to={`/admin/collections/${collection.id}`}>{collection.title}</Link></td>
                    <td className="muted">{collection.productIds.length}</td>
                    <td className="muted mono">/collections/{collection.handle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>Group products into collections such as "New in" or "Gifts". They appear in the store menu.</p>}
        </section>
      </DataState>
    </div>
  );
}

const EMPTY = { title: '', handle: '', description: '', image: '', productIds: [] };

export function CollectionEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { api } = useAdmin();
  const [state, setState] = useState({ loading: !isNew, error: null, item: isNew ? EMPTY : null });
  const products = useAdminData('/products');

  useEffect(() => {
    if (isNew) return setState({ loading: false, error: null, item: EMPTY });
    let active = true;
    api.get(`/collections/${id}`)
      .then((item) => active && setState({ loading: false, error: null, item }))
      .catch((error) => active && setState({ loading: false, error: error.message, item: null }));
    return () => { active = false; };
  }, [api, id, isNew]);

  return (
    <div className="admin-page admin-page-narrow">
      <DataState loading={state.loading || products.loading} error={state.error || products.error}>
        {state.item && products.data && <CollectionForm key={state.item.id || 'new'} initial={state.item} allProducts={products.data} />}
      </DataState>
    </div>
  );
}

function CollectionForm({ initial, allProducts }) {
  const isNew = !initial.id;
  const { api } = useAdmin();
  const store = useStore();
  const navigate = useNavigate();
  const [item, setItem] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useUnsavedWarning(JSON.stringify(item) !== JSON.stringify(saved));

  const set = (patch) => setItem((prev) => ({ ...prev, ...patch }));
  const byId = new Map(allProducts.map((product) => [product.id, product]));
  const included = item.productIds.map((pid) => byId.get(pid)).filter(Boolean);
  const candidates = allProducts.filter((product) => !item.productIds.includes(product.id) && matchesQuery(query, [product.title, product.productType, product.tags]));

  const move = (index, direction) => {
    const ids = [...item.productIds];
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    set({ productIds: ids });
  };

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { ...item, productIds: item.productIds.filter((pid) => byId.has(pid)) };
      const result = isNew ? await api.post('/collections', body) : await api.put(`/collections/${item.id}`, body);
      setItem(result);
      setSaved(result);
      await store.reload();
      if (isNew) navigate(`/admin/collections/${result.id}`, { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the collection "${item.title}"? Its products are not deleted.`)) return;
    await api.remove(`/collections/${item.id}`);
    await store.reload();
    navigate('/admin/collections');
  }

  return (
    <form onSubmit={save}>
      <PageHead title={isNew ? 'Create collection' : item.title || 'Untitled'} back={['/admin/collections', 'Collections']}>
        {!isNew && <a href={`/collections/${saved.handle}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">View</a>}
      </PageHead>

      <section className="card form">
        <Field label="Title"><input value={item.title} onChange={(event) => set({ title: event.target.value })} required maxLength={100} placeholder="e.g. Gifts under 50" /></Field>
        <Field label="Description (optional)"><textarea rows={3} value={item.description} onChange={(event) => set({ description: event.target.value })} maxLength={2000} /></Field>
        <Field label="URL handle" hint={`Address: /collections/${item.handle || 'generated-from-title'}`}>
          <input value={item.handle} onChange={(event) => set({ handle: event.target.value.toLowerCase() })} placeholder="generated from the title" maxLength={80} />
        </Field>
      </section>

      <section className="card">
        <h2 className="card-title">Image <span className="hint">Optional. The first product's photo is used if empty.</span></h2>
        <ImageManager single max={1} images={item.image ? [item.image] : []} onChange={(images) => set({ image: images[0] || '' })} />
      </section>

      <section className="card">
        <h2 className="card-title">Products <span className="hint">{included.length} in this collection, shown in this order</span></h2>
        {included.length > 0 && (
          <div className="order-list" style={{ marginBottom: '1.25rem' }}>
            {included.map((product, index) => (
              <div key={product.id}>
                {product.images[0] ? <img src={product.images[0]} alt="" className="table-thumb" /> : <span className="table-thumb" />}
                <span>{product.title}{product.status !== 'active' && <span className="muted small"> · {product.status}</span>}</span>
                <span className="button-row" style={{ margin: 0 }}>
                  <button type="button" className="link-button small" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${product.title} up`}>↑</button>
                  <button type="button" className="link-button small" disabled={index === included.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${product.title} down`}>↓</button>
                  <button type="button" className="link-button small" onClick={() => set({ productIds: item.productIds.filter((pid) => pid !== product.id) })}>Remove</button>
                </span>
              </div>
            ))}
          </div>
        )}
        <Field label="Add products">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" />
        </Field>
        {candidates.length > 0 && (
          <div className="picker-list" style={{ marginTop: '0.5rem' }}>
            {candidates.slice(0, 50).map((product) => (
              <label key={product.id}>
                <input type="checkbox" checked={false} onChange={() => set({ productIds: [...item.productIds, product.id] })} />
                {product.title}
              </label>
            ))}
          </div>
        )}
      </section>

      <SaveBar saving={saving} error={error} onDelete={isNew ? null : remove} />
    </form>
  );
}
