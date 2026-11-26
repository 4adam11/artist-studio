import { Link } from 'react-router';
import { ProductGrid } from '../components/ProductCard.jsx';
import { productsInCollection } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Home() {
  usePageTitle();
  const { settings, products, collections } = useStore();
  const featured = collections.find((c) => c.id === settings.featuredCollectionId);
  const latest = products.filter((p) => p.available).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  // One full row; "View all" leads to the rest.
  const shown = (featured ? productsInCollection(featured, products) : latest).slice(0, 4);
  const coverFor = (collection) => collection.image || productsInCollection(collection, products)[0]?.images[0];

  return (
    <>
      <section className="container hero">
        <h1>{settings.storeName}</h1>
        {settings.tagline && <p className="hero-tagline">{settings.tagline}</p>}
        <Link to="/collections/all" className="btn">Shop all</Link>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>{featured ? featured.title : 'New arrivals'}</h2>
          <Link to={featured ? `/collections/${featured.handle}` : '/collections/all'} className="text-link">View all</Link>
        </div>
        <ProductGrid products={shown} />
      </section>

      {collections.length > 0 && (
        <section className="container section">
          <div className="section-head"><h2>Collections</h2></div>
          <div className="collection-grid">
            {collections.map((collection) => (
              <Link key={collection.id} to={`/collections/${collection.handle}`} className="collection-card">
                <div className="collection-card-media">
                  {coverFor(collection) ? <img src={coverFor(collection)} alt="" loading="lazy" /> : <span className="image-empty" />}
                </div>
                <span className="collection-card-title">{collection.title}</span>
                <span className="muted small">{collection.productIds.length} products</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
