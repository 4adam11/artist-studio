import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { formatDate, formatMoney } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { takePendingOrder } from '../state/pendingOrder.js';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

function headline(order) {
  if (order.status === 'pending_payment') return ['Waiting for payment', 'If you just paid, this can take a moment. If you left the payment page, your cart is still saved.'];
  if (order.status === 'cancelled') return ['Order cancelled', 'Contact us if you have any questions.'];
  if (order.fulfillmentStatus === 'fulfilled') return ['Your order has shipped', 'Thanks for shopping with us.'];
  if (order.paymentStatus === 'paid') return ['Thank you for your order', 'Payment received. A confirmation email is on its way.'];
  return ['Thank you for your order', 'We will email you shortly with payment details.'];
}

export default function Order() {
  usePageTitle('Order status');
  const { token } = useParams();
  const { clear } = useCart();
  const { reload } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.order(token);
      setOrder(result);
      // Empty the cart once the order the shopper just placed is confirmed.
      if (result.status === 'open' && takePendingOrder(token)) {
        clear();
        reload();
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [token, clear, reload]);

  useEffect(() => { load(); }, [load]);

  if (error) return <section className="container section narrow"><ErrorNotice message={error} onRetry={load} /></section>;
  if (!order) return <section className="container section narrow"><Loading /></section>;

  const money = (amount) => formatMoney(amount, order.currency);
  const [title, detail] = headline(order);
  const a = order.shippingAddress;
  const steps = [
    ['Confirmed', order.status !== 'pending_payment'],
    ['Paid', order.paymentStatus === 'paid'],
    ['Shipped', order.fulfillmentStatus === 'fulfilled']
  ];

  return (
    <section className="container section narrow">
      <p className="muted small mono">Order #{order.number} · {formatDate(order.createdAt)}</p>
      <h1>{title}</h1>
      <p>{detail}</p>

      {order.status !== 'cancelled' && (
        <ol className="steps">
          {steps.map(([label, done]) => <li key={label} className={done ? 'is-done' : ''}>{label}</li>)}
        </ol>
      )}

      {order.trackingNumber && (
        <p>
          Tracking number: <span className="mono">{order.trackingNumber}</span>
          {order.trackingUrl && <> · <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-link">Track package</a></>}
        </p>
      )}

      {order.status === 'pending_payment' && (
        <div className="button-row">
          <button type="button" className="btn" onClick={load}>Check again</button>
          <Link to="/cart" className="btn btn-outline">Back to cart</Link>
        </div>
      )}

      <div className="box">
        <ul className="summary-items">
          {order.items.map((item) => (
            <li key={item.variantId}>
              <span className="summary-name">
                {item.quantity} × {item.title}
                {item.variantTitle && <span className="muted small">{item.variantTitle}</span>}
              </span>
              <span>{money(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {order.discount && <div><dt>Discount ({order.discount.code})</dt><dd>{order.discount.type === 'shipping' ? 'Free shipping' : `−${money(order.discount.amount)}`}</dd></div>}
          <div><dt>Shipping ({order.shipping.name})</dt><dd>{order.shipping.price ? money(order.shipping.price) : 'Free'}</dd></div>
          {order.tax > 0 && <div><dt>Tax</dt><dd>{money(order.tax)}</dd></div>}
          <div className="totals-total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
      </div>

      <div className="box">
        <h2 className="box-title">Shipping address</h2>
        <address>
          {order.customerName}<br />
          {a.line1}<br />
          {a.line2 && <>{a.line2}<br /></>}
          {[a.postalCode, a.city, a.region].filter(Boolean).join(' ')}<br />
          {a.country}
        </address>
      </div>

      <p className="small muted">Bookmark this page to check your order later, or find it again with your order number and email.</p>
      <Link to="/collections/all" className="text-link">Continue shopping</Link>
    </section>
  );
}

export function OrderLookup() {
  usePageTitle('Find your order');
  const navigate = useNavigate();
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      const { token } = await api.lookupOrder(data.number, data.email);
      navigate(`/orders/${token}`);
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="container section narrow">
      <header className="page-header">
        <h1>Find your order</h1>
        <p className="muted">Enter the order number from your confirmation email and the email you ordered with.</p>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Order number</span>
          <input name="number" placeholder="#1001" required maxLength={20} />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} />
        </label>
        <button type="submit" className="btn" disabled={status.state === 'sending'}>Find order</button>
        {status.state === 'error' && <p className="error-text" role="alert">{status.message}</p>}
      </form>
    </section>
  );
}
