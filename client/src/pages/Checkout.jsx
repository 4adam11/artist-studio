import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useCart } from '../state/CartContext.jsx';
import { rememberPendingOrder } from '../state/pendingOrder.js';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const { settings, money } = useStore();
  const { lines } = useCart();
  const [status, setStatus] = useState({ state: 'idle' });
  const [codeInput, setCodeInput] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [shippingRateId, setShippingRateId] = useState(settings.shippingRates[0]?.id || '');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  const items = useMemo(() => lines.map((line) => ({ variantId: line.variant.id, quantity: line.quantity })), [lines]);
  const itemsKey = JSON.stringify(items);

  // The server works out the exact total (shipping, tax and discount
  // included), so what the buyer sees here is exactly what they pay.
  useEffect(() => {
    if (!items.length) return undefined;
    let active = true;
    api.quote({ items, discountCode, shippingRateId })
      .then((result) => { if (active) { setQuote(result); setQuoteError(null); } })
      .catch((error) => active && setQuoteError(error.message));
    return () => { active = false; };
    // itemsKey stands in for items so the quote only reloads when the cart really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, discountCode, shippingRateId]);

  if (!lines.length && status.state !== 'sending') return <Navigate to="/cart" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    setStatus({ state: 'sending' });
    try {
      const result = await api.checkout({
        ...data,
        subscribe: form.get('subscribe') === 'on',
        discountCode: quote?.discount ? discountCode : '',
        shippingRateId,
        items
      });
      rememberPendingOrder(result.token);
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else navigate(`/orders/${result.token}`);
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="container section checkout">
      <div className="checkout-main">
        <h1>Checkout</h1>
        <form id="checkout" className="form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Contact</legend>
            <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={200} />
            <label className="checkbox-inline">
              <input type="checkbox" name="subscribe" />
              Email me about new products
            </label>
          </fieldset>

          <fieldset>
            <legend>Delivery</legend>
            <div className="form-row">
              <Field label="First name" name="firstName" autoComplete="given-name" required maxLength={60} />
              <Field label="Last name" name="lastName" autoComplete="family-name" required maxLength={60} />
            </div>
            <Field label="Address" name="line1" autoComplete="address-line1" required maxLength={120} />
            <Field label="Apartment, suite, etc. (optional)" name="line2" autoComplete="address-line2" maxLength={120} />
            <div className="form-row form-row-3">
              <Field label="City" name="city" autoComplete="address-level2" required maxLength={80} />
              <Field label="State / region" name="region" autoComplete="address-level1" maxLength={80} />
              <Field label="Postal code" name="postalCode" autoComplete="postal-code" required maxLength={20} />
            </div>
            <Field label="Country" name="country" autoComplete="country-name" required maxLength={60} />
            <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </fieldset>

          <fieldset>
            <legend>Shipping method</legend>
            <div className="choice-list">
              {(quote?.shippingRates || settings.shippingRates).map((rate) => (
                <label key={rate.id} className="choice">
                  <input type="radio" name="shippingRate" value={rate.id} checked={shippingRateId === rate.id} onChange={() => setShippingRateId(rate.id)} />
                  <span>{rate.name}</span>
                  <span>{quote ? (rate.price ? money(rate.price) : 'Free') : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Note (optional)</legend>
            <label className="visually-hidden" htmlFor="note">Order note</label>
            <textarea id="note" name="note" rows={2} maxLength={1000} placeholder="Gift message or delivery instructions" />
          </fieldset>

          <button type="submit" className="btn btn-block btn-large" disabled={status.state === 'sending' || !quote}>
            {status.state === 'sending' ? 'Placing order…' : settings.onlinePayments ? 'Continue to payment' : 'Place order'}
          </button>
          <p className="muted small">
            {settings.onlinePayments
              ? 'You will pay on a secure Stripe page.'
              : 'No payment is taken now. We will email you payment details to complete your order.'}
          </p>
          {status.state === 'error' && <p className="error-text" role="alert">{status.message}</p>}
        </form>
      </div>

      <aside className="checkout-summary" aria-label="Order summary">
        <ul className="summary-items">
          {lines.map(({ product, variant, quantity }) => (
            <li key={variant.id}>
              <span className="summary-thumb">
                {product.images[0] ? <img src={product.images[0]} alt="" /> : <span className="image-empty" />}
                <span className="summary-qty">{quantity}</span>
              </span>
              <span className="summary-name">
                {product.title}
                {variant.options.length > 0 && <span className="muted small">{variant.options.join(' / ')}</span>}
              </span>
              <span>{money(variant.price * quantity)}</span>
            </li>
          ))}
        </ul>

        <form className="inline-form" onSubmit={(event) => { event.preventDefault(); setDiscountCode(codeInput.trim().toUpperCase()); }}>
          <label className="visually-hidden" htmlFor="discount">Discount code</label>
          <input id="discount" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Discount code" maxLength={30} />
          <button type="submit" className="btn btn-outline" disabled={!codeInput.trim()}>Apply</button>
        </form>
        {quote?.discountError && <p className="error-text small">{quote.discountError}</p>}
        {quoteError && <p className="error-text small">{quoteError}</p>}

        {quote && (
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
            {quote.discount && (
              <div>
                <dt>
                  Discount <span className="tag">{quote.discount.code}</span>{' '}
                  <button type="button" className="link-button small" onClick={() => { setDiscountCode(''); setCodeInput(''); }}>Remove</button>
                </dt>
                <dd>{quote.discount.type === 'shipping' ? 'Free shipping' : `−${money(quote.discount.amount)}`}</dd>
              </div>
            )}
            <div><dt>Shipping</dt><dd>{quote.shipping.price ? money(quote.shipping.price) : 'Free'}</dd></div>
            {quote.tax > 0 && <div><dt>Tax</dt><dd>{money(quote.tax)}</dd></div>}
            <div className="totals-total"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
          </dl>
        )}
        <Link to="/cart" className="text-link small">Edit cart</Link>
      </aside>
    </section>
  );
}

function Field({ label, name, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} {...props} />
    </label>
  );
}
