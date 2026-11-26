import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ProductGrid } from '../components/ProductCard.jsx';
import { filterProducts, productsInCollection, SORT_OPTIONS } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { pluralize } from '../format.js';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

// Handles /collections/all (every product) and /collections/:handle.
export default function Collection() {
  const { handle } = useParams();
  const { products, collectionByHandle } = useStore();
  const collection = handle === 'all' ? null : collectionByHandle(handle);
  usePageTitle(collection ? collection.title : handle === 'all' ? 'All products' : 'Not found');

  if (handle !== 'all' && !collection) return <NotFound />;

  const items = collection ? productsInCollection(collection, products) : products;
  return (
    <ProductList
      key={handle}
      title={collection ? collection.title : 'All products'}
      description={collection?.description}
      products={items}
    />
  );
}

export function ProductList({ title, description, products, defaultSort = 'featured' }) {
  // Filters live in the URL so a filtered page can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    type: params.get('type') || '',
    inStock: params.get('available') === '1',
    sort: params.get('sort') || defaultSort
  }));
  const types = [...new Set(products.map((product) => product.productType).filter(Boolean))].sort();
  const visible = filterProducts(products, filters);

  function change(patch) {
    const next = { ...filters, ...patch };
    setFilters(next);
    const search = new URLSearchParams();
    if (next.type) search.set('type', next.type);
    if (next.inStock) search.set('available', '1');
    if (next.sort !== defaultSort) search.set('sort', next.sort);
    setParams(search, { replace: true });
  }

  return (
    <section className="container section">
      <header className="page-header">
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </header>

      <div className="toolbar">
        <div className="toolbar-filters">
          {types.length > 1 && (
            <label className="select-inline">
              <span className="visually-hidden">Product type</span>
              <select value={filters.type} onChange={(event) => change({ type: event.target.value })}>
                <option value="">All types</option>
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          )}
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.inStock} onChange={(event) => change({ inStock: event.target.checked })} />
            In stock only
          </label>
        </div>
        <div className="toolbar-right">
          <span className="muted small" aria-live="polite">{pluralize(visible.length, 'product')}</span>
          <label className="select-inline">
            <span className="visually-hidden">Sort by</span>
            <select value={filters.sort} onChange={(event) => change({ sort: event.target.value })}>
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {visible.length ? <ProductGrid products={visible} /> : (
        <div className="empty">
          <p>No products match these filters.</p>
          <button type="button" className="btn btn-outline" onClick={() => change({ type: '', inStock: false })}>Clear filters</button>
        </div>
      )}
    </section>
  );
}
