import { Link } from 'react-router';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { useCartLines } from '../state/useCartLines.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Cart() {
  usePageTitle('Cart');
  const { update, remove } = useCart();
  const { config } = useStudio();
  const { lines, total, adjusted } = useCartLines();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <section className="page">
      <h1>Your cart</h1>
      {adjusted && (
        <p className="notice" role="status">Some items changed because they sold out or have less stock now. Your cart has been updated.</p>
      )}

      {!lines.length ? (
        <>
          <p>Your cart is empty. Pick a favorite piece from the shop and it will appear here.</p>
          <Link to="/shop" className="btn">Browse the shop</Link>
        </>
      ) : (
        <>
          <p className="muted">{count} {count === 1 ? 'item' : 'items'} selected</p>
          {lines.map(({ product, quantity }) => (
            <div key={product.id} className="cart-row">
              <img src={product.image} alt="" className="cart-thumb" />
              <Link to={`/shop/${product.id}`} className="cart-title">{product.title}</Link>
              <span>{formatPrice(product.price, config.currency)}</span>
              <div className="stepper" role="group" aria-label={`Quantity of ${product.title}`}>
                <button type="button" onClick={() => update(product, quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => update(product, quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity">+</button>
              </div>
              <strong>{formatPrice(product.price * quantity, config.currency)}</strong>
              <button type="button" className="chip" onClick={() => remove(product.id)}>Remove</button>
            </div>
          ))}
          <div className="cart-summary">
            <strong>Total: {formatPrice(total, config.currency)}</strong>
            <Link to="/checkout" className="btn">Checkout</Link>
          </div>
        </>
      )}
    </section>
  );
}
