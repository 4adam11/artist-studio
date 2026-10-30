import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import NewsletterForm from '../components/NewsletterForm.jsx';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { formatDate, formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { takePendingOrder } from '../state/pendingOrder.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

const MESSAGES = {
  paid: ['Thank you, your payment was received!', 'A confirmation email is on its way to you. You will hear from the artist again when your order ships.'],
  received: ['Thank you, your order was received!', 'A confirmation email is on its way. The artist will email you shortly to arrange payment and delivery.'],
  shipped: ['Your order is on its way!', 'Thank you for supporting handmade work.'],
  awaiting_payment: ['Waiting for payment confirmation', 'If you just paid, this can take a moment. If you left the payment page, your cart is still saved.'],
  cancelled: ['This order was cancelled', 'If this is unexpected, please get in touch through the contact page.']
};

const STEPS = [['Order placed', ['awaiting_payment', 'paid', 'received', 'shipped']], ['Confirmed', ['paid', 'received', 'shipped']], ['Shipped', ['shipped']]];

export default function OrderConfirmation() {
  usePageTitle('Your order');
  const { token } = useParams();
  const { clear } = useCart();
  const { reload, config } = useStudio();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.getOrder(token);
      setOrder(result);
      if (['paid', 'received'].includes(result.status) && takePendingOrder(token)) {
        clear();
        reload();
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [token, clear, reload]);

  useEffect(() => { load(); }, [load]);

  if (error) return <section className="page"><ErrorNotice message={error} onRetry={load} /></section>;
  if (!order) return <section className="page"><Loading label="Loading your order…" /></section>;

  const [title, detail] = MESSAGES[order.status] || MESSAGES.received;
  const money = (amount) => formatPrice(amount, order.currency || config.currency);
  const address = order.address;

  return (
    <section className="page narrow">
      <p className="eyebrow">Order #{order.id} · {formatDate(order.createdAt)}</p>
      <h1>{title}</h1>
      <p>{detail}</p>

      {order.status !== 'cancelled' && (
        <ol className="order-steps">
          {STEPS.map(([label, statuses]) => <li key={label} className={statuses.includes(order.status) ? 'done' : ''}>{label}</li>)}
        </ol>
      )}
      {order.trackingNumber && <p><strong>Tracking number:</strong> {order.trackingNumber}</p>}

      {order.status === 'awaiting_payment' && (
        <div className="actions actions-left">
          <button type="button" className="btn" onClick={load}>Check again</button>
          <Link to="/cart" className="btn btn-secondary">Back to cart</Link>
        </div>
      )}

      <div className="panel">
        <ul className="summary-list">
          {order.items.map((item) => (
            <li key={item.productId}>
              <span>{item.quantity} × {item.title}</span>
              <span>{money(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {order.discount && <div className="discount-line"><dt>Discount ({order.discount.code})</dt><dd>−{money(order.discount.amount)}</dd></div>}
          <div><dt>Shipping</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
          <div className="totals-grand"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
        {address && (
          <>
            <h2 className="panel-title">Shipping to</h2>
            <address className="address">
              {order.name}<br />
              {address.line1}<br />
              {address.line2 && <>{address.line2}<br /></>}
              {[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}<br />
              {address.country}
            </address>
          </>
        )}
      </div>
      <p className="muted small">Bookmark this page to check on your order later.</p>

      <div className="panel">
        <h2 className="panel-title">Hear about new pieces first</h2>
        <NewsletterForm source="order" compact />
      </div>
      <Link to="/shop" className="text-link">Continue shopping</Link>
    </section>
  );
}
