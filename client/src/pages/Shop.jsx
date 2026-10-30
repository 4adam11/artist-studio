import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ProductCard } from '../components/Cards.jsx';
import { filterProducts, SORT_OPTIONS } from '../state/catalog.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Shop() {
  usePageTitle('Shop');
  const { products } = useStudio();
  // Filters live in the URL so a filtered view can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  // The search box keeps its own state so typing is never slowed down by
  // URL updates (React Router applies those as low-priority renders).
  const [query, setQuery] = useState(() => params.get('q') || '');
  const filters = {
    q: query,
    category: params.get('category') || 'All',
    sort: params.get('sort') || 'featured',
    inStock: params.get('available') === '1'
  };
  const categories = ['All', ...new Set(products.map((item) => item.category))];
  const visible = filterProducts(products, filters);

  // Start from the address bar itself, not the last rendered URL: two quick
  // changes in a row would otherwise both start from the same old URL and the
  // second would undo the first.
  function setFilter(key, value, empty) {
    const next = new URLSearchParams(window.location.search);
    if (value === empty) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  function search(value) {
    setQuery(value);
    setFilter('q', value, '');
  }

  function clearFilters() {
    setQuery('');
    setParams({}, { replace: true });
  }

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Shop</h1>
        <p className="muted">Original handmade pieces, each one made by hand in the studio.</p>
      </div>

      <div className="shop-toolbar">
        <label className="toolbar-search">
          <span className="visually-hidden">Search the shop</span>
          <input type="search" placeholder="Search the shop" value={query} onChange={(event) => search(event.target.value)} />
        </label>
        <div className="filter-row" role="group" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${filters.category === category ? 'chip-active' : ''}`}
              aria-pressed={filters.category === category}
              onClick={() => setFilter('category', category, 'All')}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.inStock} onChange={(event) => setFilter('available', event.target.checked ? '1' : '', '')} />
            In stock only
          </label>
          <label className="select-label">
            <span className="visually-hidden">Sort by</span>
            <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value, 'featured')}>
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p className="muted small" aria-live="polite">{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</p>
      {visible.length ? (
        <div className="grid">
          {visible.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state">
          <p>No pieces match your search.</p>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
        </div>
      )}
    </section>
  );
}
