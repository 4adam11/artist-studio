import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin } from './AdminContext.jsx';
import { currencySymbol, DataState, Field, ImageManager, MoneyInput, PageHead, ProductStatusBadge, SaveBar, useUnsavedWarning } from './ui.jsx';
import { parseValues, syncVariants } from './variants.js';

const EMPTY = {
  title: '', handle: '', description: '', productType: '', vendor: '', tags: [], status: 'active', images: [],
  options: [], variants: [{ options: [], price: '', compareAtPrice: null, sku: '', stock: 1 }], collectionIds: []
};

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { api } = useAdmin();
  const [state, setState] = useState({ loading: !isNew, error: null, product: isNew ? EMPTY : null });

  useEffect(() => {
    if (isNew) {
      setState({ loading: false, error: null, product: EMPTY });
      return;
    }
    let active = true;
    api.get(`/products/${id}`)
      .then((product) => active && setState({ loading: false, error: null, product }))
      .catch((error) => active && setState({ loading: false, error: error.message, product: null }));
    return () => { active = false; };
  }, [api, id, isNew]);

  return (
    <div className="admin-page">
      <DataState loading={state.loading} error={state.error}>
        {state.product && <ProductForm key={state.product.id || 'new'} initial={state.product} />}
      </DataState>
    </div>
  );
}

function ProductForm({ initial }) {
  const isNew = !initial.id;
  const { api } = useAdmin();
  const store = useStore();
  const navigate = useNavigate();
  const [product, setProduct] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [collections, setCollections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const symbol = currencySymbol(store.settings.currency);
  const dirty = JSON.stringify(product) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  useEffect(() => {
    api.get('/collections').then(setCollections).catch(() => {});
  }, [api]);

  const set = (patch) => setProduct((prev) => ({ ...prev, ...patch }));
  const types = useMemo(() => [...new Set(store.products.map((p) => p.productType).filter(Boolean))], [store.products]);

  // ---- Options & variants ----
  const [optionText, setOptionText] = useState(() => initial.options.map((option) => option.values.join(', ')));

  function setOptions(options, texts = optionText) {
    setOptionText(texts);
    set({ options, variants: syncVariants(options, product.variants) });
  }
  const updateOption = (index, patch, text) => {
    const options = product.options.map((option, i) => (i === index ? { ...option, ...patch } : option));
    const texts = text === undefined ? optionText : optionText.map((t, i) => (i === index ? text : t));
    setOptions(options, texts);
  };
  const addOption = () => setOptions([...product.options, { name: ['Size', 'Colour', 'Material'].find((name) => !product.options.some((o) => o.name === name)) || '', values: [] }], [...optionText, '']);
  const removeOption = (index) => setOptions(product.options.filter((_, i) => i !== index), optionText.filter((_, i) => i !== index));
  const updateVariant = (index, patch) => set({ variants: product.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)) });
  const applyToAll = (field) => {
    const value = product.variants[0]?.[field];
    set({ variants: product.variants.map((variant) => ({ ...variant, [field]: value })) });
  };

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const body = {
      ...product,
      options: product.options.filter((option) => option.name.trim() && option.values.length),
      variants: product.variants.map((variant) => ({
        ...variant,
        price: variant.price === '' ? undefined : Number(variant.price),
        compareAtPrice: variant.compareAtPrice === '' || variant.compareAtPrice === null ? undefined : Number(variant.compareAtPrice),
        stock: Number(variant.stock)
      }))
    };
    try {
      const result = isNew ? await api.post('/products', body) : await api.put(`/products/${product.id}`, body);
      const next = { ...result, collectionIds: product.collectionIds };
      setProduct(next);
      setSaved(next);
      await store.reload();
      if (isNew) navigate(`/admin/products/${result.id}`, { replace: true });
      else setNotice('Saved');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    await api.remove(`/products/${product.id}`);
    await store.reload();
    navigate('/admin/products');
  }

  async function duplicate() {
    const copy = await api.post(`/products/${product.id}/duplicate`);
    navigate(`/admin/products/${copy.id}`);
  }

  const single = product.options.length === 0;
  const variant0 = product.variants[0] || EMPTY.variants[0];

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'Add product' : product.title || 'Untitled product'}
        back={['/admin/products', 'Products']}
        badges={!isNew && <ProductStatusBadge status={saved.status} />}
      >
        {!isNew && saved.status === 'active' && <a href={`/products/${saved.handle}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">View</a>}
        {!isNew && <button type="button" className="btn btn-outline btn-small" onClick={duplicate} disabled={dirty} title={dirty ? 'Save your changes first' : undefined}>Duplicate</button>}
      </PageHead>

      <div className="admin-columns">
        <div>
          <section className="card form">
            <Field label="Title"><input value={product.title} onChange={(event) => set({ title: event.target.value })} required maxLength={150} placeholder="e.g. Linen tote bag" /></Field>
            <Field label="Description" hint="Leave an empty line between paragraphs. Start a line with ## for a heading or - for a list item.">
              <textarea rows={8} value={product.description} onChange={(event) => set({ description: event.target.value })} maxLength={20000} />
            </Field>
          </section>

          <section className="card">
            <h2 className="card-title">Media</h2>
            <ImageManager images={product.images} onChange={(images) => set({ images })} />
          </section>

          {single && (
            <section className="card form">
              <h2 className="card-title" style={{ margin: 0 }}>Pricing &amp; inventory</h2>
              <div className="form-row">
                <Field label="Price"><MoneyInput symbol={symbol} value={variant0.price} onChange={(price) => updateVariant(0, { price })} required /></Field>
                <Field label="Compare-at price" hint="Original price, shown struck through when on sale">
                  <MoneyInput symbol={symbol} value={variant0.compareAtPrice ?? ''} onChange={(compareAtPrice) => updateVariant(0, { compareAtPrice })} />
                </Field>
              </div>
              <div className="form-row">
                <Field label="SKU (optional)"><input value={variant0.sku} onChange={(event) => updateVariant(0, { sku: event.target.value })} maxLength={60} /></Field>
                <Field label="Quantity in stock"><input type="number" min="0" step="1" value={variant0.stock} onChange={(event) => updateVariant(0, { stock: event.target.value })} required /></Field>
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="card-title">
              Variants
              {product.options.length < 3 && <button type="button" className="btn btn-outline btn-small" onClick={addOption}>Add option</button>}
            </h2>
            {single && <p className="hint">Add options like size or colour if this product comes in different versions.</p>}
            {product.options.map((option, index) => (
              <div key={index} className="option-row">
                <Field label="Option name"><input value={option.name} onChange={(event) => updateOption(index, { name: event.target.value })} placeholder="Size" maxLength={30} required /></Field>
                <Field label="Values" hint="Separate with commas, e.g. S, M, L">
                  <input
                    value={optionText[index] ?? ''}
                    onChange={(event) => updateOption(index, { values: parseValues(event.target.value) }, event.target.value)}
                    placeholder="S, M, L"
                    required
                  />
                </Field>
                <button type="button" className="link-button small" style={{ marginTop: '1.9rem' }} onClick={() => removeOption(index)}>Remove</button>
              </div>
            ))}
            {!single && product.variants.length > 0 && (
              <div className="table-wrap" style={{ marginTop: '1rem' }}>
                <table className="table variant-table">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Price {product.variants.length > 1 && <button type="button" className="link-button small" onClick={() => applyToAll('price')}>apply first to all</button>}</th>
                      <th>Compare-at</th>
                      <th>SKU</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant, index) => {
                      const name = variant.options.join(' / ');
                      return (
                        <tr key={name}>
                          <td>{name}</td>
                          <td><MoneyInput symbol={symbol} value={variant.price} onChange={(price) => updateVariant(index, { price })} required aria-label={`Price for ${name}`} /></td>
                          <td><MoneyInput symbol={symbol} value={variant.compareAtPrice ?? ''} onChange={(compareAtPrice) => updateVariant(index, { compareAtPrice })} aria-label={`Compare-at price for ${name}`} /></td>
                          <td><input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} maxLength={60} aria-label={`SKU for ${name}`} /></td>
                          <td><input type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} required aria-label={`Stock for ${name}`} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card form">
            <h2 className="card-title" style={{ margin: 0 }}>Search engine listing</h2>
            <Field label="URL handle" hint={`Address: /products/${product.handle || 'generated-from-title'}`}>
              <input value={product.handle} onChange={(event) => set({ handle: event.target.value.toLowerCase() })} placeholder="generated from the title" maxLength={80} />
            </Field>
          </section>
        </div>

        <div>
          <section className="card form">
            <Field label="Status" hint={product.status === 'active' ? 'Visible in your store' : product.status === 'draft' ? 'Hidden until you set it to Active' : 'Hidden and kept for your records'}>
              <select value={product.status} onChange={(event) => set({ status: event.target.value })}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </section>

          <section className="card form">
            <h2 className="card-title" style={{ margin: 0 }}>Organisation</h2>
            <Field label="Product type">
              <input value={product.productType} onChange={(event) => set({ productType: event.target.value })} list="product-types" maxLength={60} placeholder="e.g. Crochet" />
              <datalist id="product-types">{types.map((type) => <option key={type} value={type} />)}</datalist>
            </Field>
            <Field label="Vendor (optional)"><input value={product.vendor} onChange={(event) => set({ vendor: event.target.value })} maxLength={60} /></Field>
            <Field label="Tags" hint="Separate with commas. Used by search.">
              <input value={product.tags.join(', ')} onChange={(event) => set({ tags: event.target.value.split(',').map((tag) => tag.trimStart()) })} />
            </Field>
            <div className="field">
              <span>Collections</span>
              {collections.length ? (
                <div className="check-list">
                  {collections.map((collection) => (
                    <label key={collection.id} className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={product.collectionIds.includes(collection.id)}
                        onChange={(event) => set({
                          collectionIds: event.target.checked
                            ? [...product.collectionIds, collection.id]
                            : product.collectionIds.filter((cid) => cid !== collection.id)
                        })}
                      />
                      {collection.title}
                    </label>
                  ))}
                </div>
              ) : <p className="hint">No collections yet. <Link to="/admin/collections/new" className="text-link">Create one</Link>.</p>}
            </div>
          </section>
        </div>
      </div>

      <SaveBar saving={saving} error={error} onDelete={isNew ? null : remove} submitLabel={isNew ? 'Save product' : 'Save'} />
      {notice && !dirty && <p className="small muted" role="status" style={{ textAlign: 'right', margin: 0 }}>{notice}</p>}
    </form>
  );
}
