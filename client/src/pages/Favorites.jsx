import { Link } from 'react-router';
import { ProductCard } from '../components/Cards.jsx';
import { useFavorites } from '../state/FavoritesContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Favorites() {
  usePageTitle('Saved items');
  const { ids } = useFavorites();
  const { products } = useStudio();
  const saved = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean);

  return (
    <section className="page">
      <h1>Saved items</h1>
      {saved.length ? (
        <>
          <p className="muted">Pieces you've saved on this device. Handmade pieces are often one of a kind, so don't wait too long!</p>
          <div className="grid">
            {saved.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Tap the heart on any piece to save it here.</p>
          <Link to="/shop" className="btn">Browse the shop</Link>
        </div>
      )}
    </section>
  );
}
