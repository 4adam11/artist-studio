import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ProductGrid } from '../components/ProductCard.jsx';
import { matchesQuery, productText } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { pluralize } from '../format.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Search() {
  usePageTitle('Search');
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  // The box keeps its own state so typing never waits for URL updates.
  const [query, setQuery] = useState(() => params.get('q') || '');
  const results = query.trim() ? products.filter((product) => matchesQuery(query, productText(product))) : [];

  function search(value) {
    setQuery(value);
    setParams(value.trim() ? { q: value } : {}, { replace: true });
  }

  return (
    <section className="container section">
      <header className="page-header">
        <h1>Search</h1>
      </header>
      <form role="search" className="search-form" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="search-input">Search products</label>
        <input id="search-input" type="search" value={query} onChange={(event) => search(event.target.value)} placeholder="Search products" autoFocus />
      </form>
      {query.trim() && <p className="muted small" aria-live="polite">{pluralize(results.length, 'result')}</p>}
      {results.length > 0 && <ProductGrid products={results} />}
      {query.trim() && !results.length && <p className="empty">No products found for “{query.trim()}”.</p>}
    </section>
  );
}
