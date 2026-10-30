import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { useCartLines } from '../state/useCartLines.js';
import FreeShippingBar from './FreeShippingBar.jsx';
import { CloseIcon } from './Icons.jsx';
import QuantityStepper from './QuantityStepper.jsx';

// Slide-out cart that opens when something is added, so shoppers can keep
// browsing or go straight to checkout.
export default function CartDrawer() {
  const { drawerOpen, closeDrawer, update, remove } = useCart();
  const { config } = useStudio();
  const { lines, total } = useCartLines();
  const { pathname } = useLocation();
  const panel = useRef(null);

  // Close when navigating to another page.
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
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        tabIndex={-1}
        ref={panel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button type="button" className="icon-button" onClick={closeDrawer} aria-label="Close cart"><CloseIcon /></button>
        </div>

        {!lines.length ? (
          <div className="drawer-body">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn">Browse the shop</Link>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              <FreeShippingBar subtotal={total} />
              {lines.map(({ product, quantity }) => (
                <div key={product.id} className="drawer-line">
                  <img src={product.image} alt="" className="cart-thumb" />
                  <div className="drawer-line-main">
                    <Link to={`/shop/${product.id}`} className="cart-title">{product.title}</Link>
                    <span className="muted small">{formatPrice(product.price, config.currency)}</span>
                    <div className="drawer-line-actions">
                      <QuantityStepper product={product} quantity={quantity} onChange={update} />
                      <button type="button" className="link-button" onClick={() => remove(product.id)}>Remove</button>
                    </div>
                  </div>
                  <strong>{formatPrice(product.price * quantity, config.currency)}</strong>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <p className="summary-total"><span>Subtotal</span><strong>{formatPrice(total, config.currency)}</strong></p>
              <p className="muted small">Shipping and discount codes are added at checkout.</p>
              <Link to="/checkout" className="btn btn-block">Checkout</Link>
              <Link to="/cart" className="btn btn-ghost btn-block">View cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
