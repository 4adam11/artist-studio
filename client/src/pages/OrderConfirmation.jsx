import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { takePendingOrder } from '../state/pendingOrder.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

const MESSAGES = {
  paid: ['Thank you, your payment was received!', 'A confirmation has been sent to the studio. You will hear from the artist when your order ships.'],
  received: ['Thank you, your order was received!', 'The artist will email you shortly to confirm your order and arrange payment and delivery.'],
  shipped: ['Your order is on its way!', 'Thank you for supporting handmade work.'],
  awaiting_payment: ['Waiting for payment confirmation', 'If you just paid, this can take a moment. If you left the payment page, your cart is still saved.'],
  cancelled: ['This order was cancelled', 'If this is unexpected, please get in touch through the contact page.']
};

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
  const currency = order.currency || config.currency;

  return (
    <section className="page narrow">
      <p className="eyebrow">Order #{order.id}</p>
      <h1>{title}</h1>
      <p>{detail}</p>
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
              <span>{formatPrice(item.price * item.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        <p className="summary-total"><span>Total</span><strong>{formatPrice(order.total, currency)}</strong></p>
      </div>
      <p className="muted small">Keep this page's address to check your order later.</p>
      <Link to="/shop" className="text-link">Continue shopping</Link>
    </section>
  );
}
