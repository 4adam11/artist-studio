import { Link } from 'react-router';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';

export function ArtworkCard({ artwork }) {
  return (
    <article className="card">
      <Link to={`/portfolio/${artwork.id}`} className="card-image-link" tabIndex={-1}>
        <img src={artwork.image} alt={artwork.title} loading="lazy" />
      </Link>
      <div className="card-body">
        <p className="tag">{artwork.category}</p>
        <h3>{artwork.title}</h3>
        <p>{artwork.description}</p>
        <Link to={`/portfolio/${artwork.id}`} className="text-link">View details</Link>
      </div>
    </article>
  );
}

export function ProductCard({ product }) {
  const { config } = useStudio();

  return (
    <article className="card">
      <Link to={`/shop/${product.id}`} className="card-image-link" tabIndex={-1}>
        <img src={product.image} alt={product.title} loading="lazy" />
      </Link>
      <div className="card-body">
        <p className="tag">{product.category}</p>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
        <p className="price">{formatPrice(product.price, config.currency)}</p>
        <div className="card-actions">
          <AddToCartButton product={product} />
          <Link to={`/shop/${product.id}`} className="text-link">View product</Link>
        </div>
      </div>
    </article>
  );
}

export function AddToCartButton({ product }) {
  const { cart, add } = useCart();
  const inCart = cart.find((item) => item.id === product.id)?.quantity || 0;

  if (product.stock < 1) return <span className="stock stock-out">Sold out</span>;
  if (inCart >= product.stock) return <Link to="/cart" className="btn btn-secondary">In your cart</Link>;

  return (
    <button type="button" className="btn" onClick={() => add(product)}>
      {inCart ? `Add another (${inCart} in cart)` : 'Add to cart'}
    </button>
  );
}

export function StockNote({ stock }) {
  if (stock < 1) return <p className="stock stock-out">Sold out</p>;
  if (stock === 1) return <p className="stock">One of a kind, only 1 available</p>;
  if (stock <= 3) return <p className="stock">Only {stock} left</p>;
  return null;
}
