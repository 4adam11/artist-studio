import { Link } from 'react-router';
import FreeShippingBar from '../components/FreeShippingBar.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
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
        <div className="empty-state">
          <p>Your cart is empty. Pick a favorite piece from the shop and it will appear here.</p>
          <Link to="/shop" className="btn">Browse the shop</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <p className="muted">{count} {count === 1 ? 'item' : 'items'}</p>
            {lines.map(({ product, quantity }) => (
              <div key={product.id} className="cart-row">
                <img src={product.image} alt="" className="cart-thumb" />
                <div className="cart-row-main">
                  <Link to={`/shop/${product.id}`} className="cart-title">{product.title}</Link>
                  <span className="muted small">{formatPrice(product.price, config.currency)} each</span>
                  <button type="button" className="link-button" onClick={() => remove(product.id)}>Remove</button>
                </div>
                <QuantityStepper product={product} quantity={quantity} onChange={update} />
                <strong className="cart-line-total">{formatPrice(product.price * quantity, config.currency)}</strong>
              </div>
            ))}
          </div>
          <aside className="panel cart-aside">
            <FreeShippingBar subtotal={total} />
            <p className="summary-total"><span>Subtotal</span><strong>{formatPrice(total, config.currency)}</strong></p>
            <p className="muted small">Shipping and discount codes are calculated at checkout.</p>
            <Link to="/checkout" className="btn btn-block">Checkout</Link>
            <Link to="/shop" className="text-link center-text">Continue shopping</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
