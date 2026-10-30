import { ProductCard } from '../components/Cards.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Shop() {
  usePageTitle('Shop');
  const { products } = useStudio();
  // Show what's available first; sold-out pieces stay visible as part of the story.
  const sorted = [...products].sort((a, b) => (b.stock > 0) - (a.stock > 0));

  return (
    <section className="page">
      <div className="section-head">
        <h1>Shop</h1>
        <p>Original handmade pieces ready to take home.</p>
      </div>
      {sorted.length ? (
        <div className="grid">
          {sorted.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <p className="muted">The shop is being restocked. Check back soon!</p>
      )}
    </section>
  );
}
