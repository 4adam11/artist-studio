import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { ArtworkCard, ProductCard } from '../components/Cards.jsx';
import { matchesQuery } from '../state/catalog.js';
import { useStudio } from '../state/StudioContext.jsx';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  usePageTitle(query ? `Search: ${query}` : 'Search');
  const { products, artworks } = useStudio();
  const { data: posts } = useApi(api.getPosts);

  const productHits = query ? products.filter((item) => matchesQuery(query, [item.title, item.category, item.description, item.materials])) : [];
  const artworkHits = query ? artworks.filter((item) => matchesQuery(query, [item.title, item.category, item.description, item.story, item.materials])) : [];
  const postHits = query ? (posts || []).filter((item) => matchesQuery(query, [item.title, item.excerpt, item.body])) : [];
  const total = productHits.length + artworkHits.length + postHits.length;

  return (
    <section className="page">
      <h1>Search</h1>
      <form className="inline-form search-form" role="search" onSubmit={(event) => {
        event.preventDefault();
        setParams({ q: new FormData(event.currentTarget).get('q').trim() });
      }}>
        <label className="visually-hidden" htmlFor="search-page-input">Search</label>
        <input id="search-page-input" name="q" type="search" defaultValue={query} key={query} placeholder="Search pieces, stories, materials…" />
        <button type="submit" className="btn">Search</button>
      </form>

      {query && <p className="muted" aria-live="polite">{total} {total === 1 ? 'result' : 'results'} for “{query}”</p>}

      {productHits.length > 0 && (
        <>
          <h2>In the shop</h2>
          <div className="grid">{productHits.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </>
      )}
      {artworkHits.length > 0 && (
        <>
          <h2>In the portfolio</h2>
          <div className="grid">{artworkHits.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}</div>
        </>
      )}
      {postHits.length > 0 && (
        <>
          <h2>In the journal</h2>
          <ul className="link-list">
            {postHits.map((post) => <li key={post.id}><Link to={`/journal/${post.id}`} className="text-link">{post.title}</Link> <span className="muted">· {post.excerpt}</span></li>)}
          </ul>
        </>
      )}
      {query && total === 0 && (
        <div className="empty-state">
          <p>Nothing matched. Try a different word, or ask about a commission: I can make it for you!</p>
          <Link to="/commissions" className="btn btn-ghost">Request a commission</Link>
        </div>
      )}
    </section>
  );
}
