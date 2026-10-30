import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { AddToCartButton, FavoriteButton, ProductCard, StockNote } from '../components/Cards.jsx';
import Gallery from '../components/Gallery.jsx';
import { HandIcon, LockIcon, ShareIcon, TruckIcon } from '../components/Icons.jsx';
import { RatingSummary, StarInput, Stars } from '../components/Stars.jsx';
import { ErrorNotice, Honeypot, Loading } from '../components/Status.jsx';
import { formatDate, formatPrice } from '../format.js';
import { relatedProducts } from '../state/catalog.js';
import { useStudio } from '../state/StudioContext.jsx';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, config, settings } = useStudio();
  const product = products.find((item) => String(item.id) === id);
  usePageTitle(product?.title || 'Product not found');

  if (!product) return <NotFound title="Product not found" backTo="/shop" backLabel="Back to shop" />;

  const related = relatedProducts(product, products);

  return (
    <>
      <section className="page">
        <Breadcrumbs items={[['Home', '/'], ['Shop', '/shop'], [product.category, `/shop?category=${encodeURIComponent(product.category)}`], [product.title]]} />
        <div className="product-layout">
          <Gallery images={[product.image, ...(product.gallery || [])]} alt={product.title} />

          <div className="product-info">
            <p className="eyebrow">{product.category}</p>
            <h1>{product.title}</h1>
            <RatingSummary rating={product.rating} link="#reviews" />
            <p className="price price-large">{formatPrice(product.price, config.currency)}</p>
            <StockNote stock={product.stock} />
            <p>{product.description}</p>

            <div className="buy-row">
              <AddToCartButton product={product} />
              <FavoriteButton product={product} withLabel />
            </div>
            {product.stock < 1 && <BackInStockForm product={product} />}

            <ul className="trust-list">
              <li><HandIcon /> Handmade by the artist, one at a time</li>
              {settings.processingTime && <li><TruckIcon /> {settings.processingTime}</li>}
              <li><LockIcon /> {config.onlinePayments ? 'Secure checkout with Stripe' : 'Pay securely by invoice after ordering'}</li>
            </ul>

            <div className="accordion">
              {(product.materials || product.dimensions) && (
                <details open>
                  <summary>Materials &amp; size</summary>
                  {product.materials && <p><strong>Materials:</strong> {product.materials}</p>}
                  {product.dimensions && <p><strong>Size:</strong> {product.dimensions}</p>}
                </details>
              )}
              {product.care && (
                <details>
                  <summary>Care</summary>
                  <p>{product.care}</p>
                </details>
              )}
              <details>
                <summary>Shipping &amp; returns</summary>
                <p>
                  {settings.shippingFlat > 0 ? `Shipping is ${formatPrice(settings.shippingFlat, config.currency)}` : 'Shipping is free'}
                  {settings.freeShippingOver > 0 && `, and free on orders over ${formatPrice(settings.freeShippingOver, config.currency)}`}.
                  {settings.shipsTo && ` ${settings.shipsTo}.`}
                </p>
                <p><Link to="/shipping-returns" className="text-link">Read the full shipping &amp; returns policy</Link></p>
              </details>
              <details>
                <summary>Want something similar?</summary>
                <p>Every piece is one of a kind, but I'd love to make something just for you.</p>
                <Link to={`/commissions?ref=${encodeURIComponent(product.title)}`} className="text-link">Request a commission</Link>
              </details>
            </div>

            <ShareButton title={product.title} />
          </div>
        </div>
      </section>

      <Reviews key={product.id} product={product} />

      {related.length > 0 && (
        <section className="page">
          <h2>You may also like</h2>
          <div className="grid">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </>
  );
}

function BackInStockForm({ product }) {
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ state: 'sending' });
    try {
      await api.notifyWhenAvailable(product.id, new FormData(event.currentTarget).get('email'));
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  if (status.state === 'sent') {
    return <p className="notice" role="status">Thanks! I'll email you if this piece, or one very like it, becomes available.</p>;
  }

  return (
    <form className="notify-form" onSubmit={handleSubmit}>
      <p><strong>This piece has found a home.</strong> Leave your email and I'll let you know if it's available again.</p>
      <div className="inline-form">
        <label className="visually-hidden" htmlFor="notify-email">Email address</label>
        <input id="notify-email" name="email" type="email" placeholder="Your email" required autoComplete="email" />
        <button type="submit" className="btn" disabled={status.state === 'sending'}>Notify me</button>
      </div>
      {status.state === 'error' && <p className="error-text">{status.message}</p>}
    </form>
  );
}

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The visitor closed the share sheet.
    }
  }

  return (
    <button type="button" className="link-button share-button" onClick={share}>
      <ShareIcon size={18} /> {copied ? 'Link copied!' : 'Share this piece'}
    </button>
  );
}

function Reviews({ product }) {
  const load = useCallback(() => api.getReviews(product.id), [product.id]);
  const { data: reviews, error, loading, reload } = useApi(load);
  const [writing, setWriting] = useState(false);

  return (
    <section className="page" id="reviews">
      <div className="section-head">
        <div>
          <h2>Reviews</h2>
          {product.rating?.count > 0 && (
            <p className="rating-big"><Stars value={product.rating.average} /> {product.rating.average.toFixed(1)} out of 5 · {product.rating.count} {product.rating.count === 1 ? 'review' : 'reviews'}</p>
          )}
        </div>
        {!writing && <button type="button" className="btn btn-ghost" onClick={() => setWriting(true)}>Write a review</button>}
      </div>

      {writing && <ReviewForm product={product} onDone={() => setWriting(false)} />}
      {error && <ErrorNotice message={error} onRetry={reload} />}
      {loading && <Loading label="Loading reviews…" />}
      {reviews?.length === 0 && !writing && <p className="muted">No reviews yet. If you own this piece, I'd love to hear what you think.</p>}
      <div className="review-list">
        {reviews?.map((review) => (
          <article key={review.id} className="review">
            <Stars value={review.rating} size="small" />
            {review.title && <h3>{review.title}</h3>}
            <p className="pre-wrap">{review.body}</p>
            <p className="muted small">
              {review.name}{review.verified && <span className="verified"> · ✓ Verified buyer</span>} · {formatDate(review.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewForm({ product, onDone }) {
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      await api.addReview(product.id, { ...data, rating });
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="notice" role="status">
        <p>Thank you for your review! It will appear here once the artist has read it.</p>
        <button type="button" className="link-button" onClick={onDone}>Close</button>
      </div>
    );
  }

  return (
    <form className="form-card review-form" onSubmit={handleSubmit}>
      <StarInput value={rating} onChange={setRating} />
      <label>
        Title <span className="muted">(optional)</span>
        <input name="title" maxLength={100} />
      </label>
      <label>
        Your review
        <textarea name="body" rows={4} maxLength={2000} required />
      </label>
      <div className="form-row">
        <label>
          Your name
          <input name="name" maxLength={60} required autoComplete="name" />
        </label>
        <label>
          Email <span className="muted">(not shown; used to mark verified buyers)</span>
          <input name="email" type="email" maxLength={200} required autoComplete="email" />
        </label>
      </div>
      <Honeypot />
      {status.state === 'error' && <p className="error-text" role="alert">{status.message}</p>}
      <div className="actions actions-left">
        <button type="submit" className="btn" disabled={status.state === 'sending' || !rating}>Submit review</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
