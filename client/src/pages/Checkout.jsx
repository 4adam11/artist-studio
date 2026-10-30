import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api } from '../api.js';
import { formatPrice } from '../format.js';
import { rememberPendingOrder } from '../state/pendingOrder.js';
import { useStudio } from '../state/StudioContext.jsx';
import { useCartLines } from '../state/useCartLines.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const { config } = useStudio();
  const { lines, total, adjusted } = useCartLines();
  const [status, setStatus] = useState({ state: 'idle' });

  if (!lines.length && status.state !== 'sending') return <Navigate to="/cart" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      const result = await api.checkout({
        ...data,
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
      });
      rememberPendingOrder(result.token);
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
      } else {
        navigate(`/order/${result.token}`);
      }
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="page checkout-layout">
      <div>
        <h1>Checkout</h1>
        <form className="form-card" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" maxLength={200} required />
          </label>
          <label>
            Note for the artist <span className="muted">(optional, e.g. gift wrapping or delivery details)</span>
            <textarea name="note" rows={3} maxLength={1000} />
          </label>
          <button type="submit" className="btn" disabled={status.state === 'sending'}>
            {status.state === 'sending'
              ? 'Placing order…'
              : config.onlinePayments ? `Continue to payment · ${formatPrice(total, config.currency)}` : 'Place order'}
          </button>
          <p className="muted small">
            {config.onlinePayments
              ? 'You will be taken to Stripe to pay securely by card.'
              : 'No payment is taken now. The artist will email you to confirm your order and arrange payment and delivery.'}
          </p>
          <div aria-live="polite">
            {status.state === 'error' && <p className="error-text">{status.message}</p>}
          </div>
        </form>
      </div>

      <aside className="panel">
        <h2 className="panel-title">Order summary</h2>
        {adjusted && <p className="notice">Your cart was updated to match current stock.</p>}
        <ul className="summary-list">
          {lines.map(({ product, quantity }) => (
            <li key={product.id}>
              <span>{quantity} × {product.title}</span>
              <span>{formatPrice(product.price * quantity, config.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="summary-total"><span>Total</span><strong>{formatPrice(total, config.currency)}</strong></p>
        <Link to="/cart" className="text-link">Edit cart</Link>
      </aside>
    </section>
  );
}
