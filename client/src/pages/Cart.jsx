import { Link } from 'react-router';
import CartLine from '../components/CartLine.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Cart() {
  usePageTitle('Cart');
  const { lines, subtotal, adjusted } = useCart();
  const { money } = useStore();

  return (
    <section className="container section narrow">
      <header className="page-header">
        <h1>Cart</h1>
      </header>
      {adjusted && <p className="notice" role="status">Some items sold out or have less stock now. Your cart has been updated.</p>}

      {!lines.length ? (
        <div className="empty">
          <p>Your cart is empty.</p>
          <Link to="/collections/all" className="btn btn-outline">Continue shopping</Link>
        </div>
      ) : (
        <>
          <div className="cart-lines">
            {lines.map((line) => <CartLine key={line.variant.id} line={line} />)}
          </div>
          <div className="cart-summary">
            <div className="row-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <p className="muted small">Shipping, taxes and discounts are calculated at checkout.</p>
            <Link to="/checkout" className="btn btn-block">Check out</Link>
          </div>
        </>
      )}
    </section>
  );
}
