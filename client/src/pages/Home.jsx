import { Link } from 'react-router';
import { ArtworkCard, ProductCard } from '../components/Cards.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Home() {
  usePageTitle();
  const { artworks, products } = useStudio();
  const featured = artworks.filter((item) => item.featured);
  const newInShop = products.filter((item) => item.stock > 0).slice(-3).reverse();

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Fabric Painting • Crochet • Handcrafted Fiber Art</p>
          <h1>Every piece begins with color, texture, and patience.</h1>
          <p className="lead">
            Welcome to an artist studio where each piece is shared with care and made to be discussed, collected, and loved.
          </p>
          <div className="actions">
            <Link to="/portfolio" className="btn">Explore the portfolio</Link>
            <Link to="/shop" className="btn btn-secondary">Shop originals</Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="page">
          <div className="section-head">
            <h2>Featured works</h2>
            <Link to="/portfolio" className="text-link">See all artworks</Link>
          </div>
          <div className="grid">
            {featured.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}
          </div>
        </section>
      )}

      {newInShop.length > 0 && (
        <section className="page">
          <div className="section-head">
            <h2>New in the shop</h2>
            <Link to="/shop" className="text-link">Visit the shop</Link>
          </div>
          <div className="grid">
            {newInShop.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}
    </>
  );
}
