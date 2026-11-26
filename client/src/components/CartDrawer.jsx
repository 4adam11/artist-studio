import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useCart } from '../state/CartContext.jsx';
import { useStore } from '../state/StoreContext.jsx';
import CartLine from './CartLine.jsx';
import { CloseIcon } from './Icons.jsx';

// Slide-out cart that opens when something is added.
export default function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotal } = useCart();
  const { money } = useStore();
  const { pathname } = useLocation();
  const panel = useRef(null);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    panel.current?.focus();
    const onKey = (event) => event.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={closeDrawer}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Cart" tabIndex={-1} ref={panel} onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <h2>Cart</h2>
          <button type="button" className="icon-button" onClick={closeDrawer} aria-label="Close cart"><CloseIcon /></button>
        </div>
        {lines.length ? (
          <>
            <div className="drawer-body">
              {lines.map((line) => <CartLine key={line.variant.id} line={line} compact />)}
            </div>
            <div className="drawer-foot">
              <div className="row-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <p className="muted small">Shipping, taxes and discounts are calculated at checkout.</p>
              <Link to="/checkout" className="btn btn-block">Check out</Link>
              <Link to="/cart" className="btn btn-outline btn-block">View cart</Link>
            </div>
          </>
        ) : (
          <div className="drawer-body drawer-empty">
            <p>Your cart is empty.</p>
            <Link to="/collections/all" className="btn btn-outline">Continue shopping</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
