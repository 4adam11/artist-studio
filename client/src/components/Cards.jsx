import { Link } from 'react-router';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { useFavorites } from '../state/FavoritesContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { HeartIcon } from './Icons.jsx';
import { RatingSummary } from './Stars.jsx';

export function ArtworkCard({ artwork }) {
  return (
    <article className="card">
      <Link to={`/portfolio/${artwork.id}`} className="card-image-link" tabIndex={-1} aria-hidden="true">
        <img src={artwork.image} alt="" loading="lazy" />
      </Link>
      <div className="card-body">
        <p className="tag">{artwork.category}</p>
        <h3><Link to={`/portfolio/${artwork.id}`} className="card-title">{artwork.title}</Link></h3>
        <p>{artwork.description}</p>
      </div>
    </article>
  );
}

export function ProductCard({ product }) {
  const { config } = useStudio();
  const soldOut = product.stock < 1;
  const secondPhoto = product.gallery?.[0];

  return (
    <article className={`card product-card ${soldOut ? 'is-sold-out' : ''}`}>
      <div className="card-media">
        <Link to={`/shop/${product.id}`} className="card-image-link" tabIndex={-1} aria-hidden="true">
          <img src={product.image} alt="" loading="lazy" />
          {/* On hover, show the second photo, like most online shops do. */}
          {secondPhoto && <img src={secondPhoto} alt="" loading="lazy" className="card-image-alt" />}
        </Link>
        <StockBadge stock={product.stock} />
        <FavoriteButton product={product} />
      </div>
      <div className="card-body">
        <p className="tag">{product.category}</p>
        <h3><Link to={`/shop/${product.id}`} className="card-title">{product.title}</Link></h3>
        <RatingSummary rating={product.rating} />
        <p className="price">{formatPrice(product.price, config.currency)}</p>
        <AddToCartButton product={product} compact />
      </div>
    </article>
  );
}

export function StockBadge({ stock }) {
  if (stock < 1) return <span className="badge-pill badge-dark">Sold out</span>;
  if (stock === 1) return <span className="badge-pill">One of a kind</span>;
  if (stock <= 3) return <span className="badge-pill">Only {stock} left</span>;
  return null;
}

export function FavoriteButton({ product, withLabel = false }) {
  const { has, toggle } = useFavorites();
  const saved = has(product.id);
  return (
    <button
      type="button"
      className={`favorite-button ${saved ? 'is-saved' : ''} ${withLabel ? 'with-label' : ''}`}
      onClick={() => toggle(product.id)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? `Remove ${product.title} from saved items` : `Save ${product.title}`}
    >
      <HeartIcon filled={saved} />
      {withLabel && (saved ? 'Saved' : 'Save for later')}
    </button>
  );
}

export function AddToCartButton({ product, compact = false }) {
  const { cart, add, openDrawer } = useCart();
  const inCart = cart.find((item) => item.id === product.id)?.quantity || 0;
  const className = `btn ${compact ? 'btn-small' : 'btn-large'}`;

  if (product.stock < 1) return compact ? null : <button type="button" className={className} disabled>Sold out</button>;
  if (inCart >= product.stock) {
    return <button type="button" className={`${className} btn-secondary`} onClick={openDrawer}>In your cart</button>;
  }
  return (
    <button type="button" className={className} onClick={() => add(product)}>
      {inCart ? 'Add another' : 'Add to cart'}
    </button>
  );
}

export function StockNote({ stock }) {
  if (stock < 1) return <p className="stock stock-out">Sold out</p>;
  if (stock === 1) return <p className="stock">One of a kind: only 1 available</p>;
  if (stock <= 3) return <p className="stock">Only {stock} left</p>;
  return <p className="stock stock-in">In stock</p>;
}
