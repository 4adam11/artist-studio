import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api } from '../api.js';
import { LockIcon } from '../components/Icons.jsx';
import { formatPrice } from '../format.js';
import { rememberPendingOrder } from '../state/pendingOrder.js';
import { useStudio } from '../state/StudioContext.jsx';
import { useCartLines } from '../state/useCartLines.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const { config } = useStudio();
  const { lines, adjusted } = useCartLines();
  const [status, setStatus] = useState({ state: 'idle' });
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  const items = useMemo(() => lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })), [lines]);
  const itemsKey = JSON.stringify(items);

  // Ask the server for the exact total (shipping and discount included), so
  // what the buyer sees here is exactly what they will be charged.
  useEffect(() => {
    if (!items.length) return undefined;
    let active = true;
    api.quote(items, appliedCode)
      .then((result) => { if (active) { setQuote(result); setQuoteError(null); } })
      .catch((error) => active && setQuoteError(error.message));
    return () => { active = false; };
    // itemsKey stands in for items so the quote only reloads when the cart really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, appliedCode]);

  if (!lines.length && status.state !== 'sending') return <Navigate to="/cart" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      const result = await api.checkout({ ...data, discountCode: quote?.discount ? appliedCode : '', items });
      rememberPendingOrder(result.token);
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else navigate(`/order/${result.token}`);
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  function applyCode(event) {
    event.preventDefault();
    setAppliedCode(codeInput.trim().toUpperCase());
  }

  const money = (amount) => formatPrice(amount, config.currency);

  return (
    <section className="page checkout-layout">
      <div>
        <h1>Checkout</h1>
        <form id="checkout-form" className="form-card" onSubmit={handleSubmit}>
          <h2 className="form-section">Contact</h2>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" maxLength={200} required />
          </label>
          <label>
            Phone <span className="muted">(optional, for delivery questions)</span>
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>

          <h2 className="form-section">Shipping address</h2>
          <label>
            Full name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
          <label>
            Address
            <input name="line1" autoComplete="address-line1" maxLength={120} required />
          </label>
          <label>
            Apartment, suite, etc. <span className="muted">(optional)</span>
            <input name="line2" autoComplete="address-line2" maxLength={120} />
          </label>
          <div className="form-row">
            <label>
              City
              <input name="city" autoComplete="address-level2" maxLength={80} required />
            </label>
            <label>
              State / region
              <input name="region" autoComplete="address-level1" maxLength={80} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Postal code
              <input name="postalCode" autoComplete="postal-code" maxLength={20} required />
            </label>
            <label>
              Country
              <input name="country" autoComplete="country-name" maxLength={60} required />
            </label>
          </div>
          <label>
            Note for the artist <span className="muted">(optional, e.g. a gift message)</span>
            <textarea name="note" rows={3} maxLength={1000} />
          </label>

          <button type="submit" className="btn btn-large" disabled={status.state === 'sending' || !quote}>
            {status.state === 'sending'
              ? 'Placing order…'
              : config.onlinePayments ? `Continue to payment${quote ? ` · ${money(quote.total)}` : ''}` : 'Place order'}
          </button>
          <p className="muted small secure-note">
            <LockIcon size={16} />{' '}
            {config.onlinePayments
              ? 'You will be taken to Stripe to pay securely by card. Your card details never touch this site.'
              : 'No payment is taken now. The artist will email you to confirm your order and arrange payment.'}
          </p>
          <div aria-live="polite">
            {status.state === 'error' && <p className="error-text">{status.message}</p>}
          </div>
        </form>
      </div>

      <aside className="panel order-summary">
        <h2 className="panel-title">Order summary</h2>
        {adjusted && <p className="notice">Your cart was updated to match current stock.</p>}
        <ul className="summary-list">
          {lines.map(({ product, quantity }) => (
            <li key={product.id}>
              <span className="summary-item">
                <span className="thumb-wrap">
                  <img src={product.image} alt="" className="summary-thumb" />
                  <span className="thumb-qty">{quantity}</span>
                </span>
                {product.title}
              </span>
              <span>{money(product.price * quantity)}</span>
            </li>
          ))}
        </ul>

        <form className="inline-form discount-form" onSubmit={applyCode}>
          <label className="visually-hidden" htmlFor="discount-code">Discount code</label>
          <input id="discount-code" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Discount code" maxLength={30} />
          <button type="submit" className="btn btn-ghost" disabled={!codeInput.trim()}>Apply</button>
        </form>
        {quote?.discountError && <p className="error-text small">{quote.discountError}</p>}
        {quoteError && <p className="error-text small">{quoteError}</p>}

        {quote ? (
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
            {quote.discount && (
              <div className="discount-line">
                <dt>
                  Discount ({quote.discount.code}){' '}
                  <button type="button" className="link-button small" onClick={() => { setAppliedCode(''); setCodeInput(''); }}>Remove</button>
                </dt>
                <dd>−{money(quote.discount.amount)}</dd>
              </div>
            )}
            <div><dt>Shipping</dt><dd>{quote.shipping ? money(quote.shipping) : 'Free'}</dd></div>
            <div className="totals-grand"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
          </dl>
        ) : (
          !quoteError && <p className="muted small">Calculating…</p>
        )}
        <Link to="/cart" className="text-link">Edit cart</Link>
      </aside>
    </section>
  );
}
