import { Link } from 'react-router';
import { api } from '../api.js';
import { ArtworkCard, ProductCard } from '../components/Cards.jsx';
import { HandIcon, LockIcon, TruckIcon } from '../components/Icons.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import { formatDate, formatDateRange, formatPrice, todayISO } from '../format.js';
import { useStudio } from '../state/StudioContext.jsx';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';

const loadHomeExtras = () => Promise.all([api.getPosts(), api.getEvents()]);

export default function Home() {
  usePageTitle();
  const { artworks, products, settings, config } = useStudio();
  const { data } = useApi(loadHomeExtras);
  const [posts = [], events = []] = data || [];
  const featured = artworks.filter((item) => item.featured);
  const newInShop = products.filter((item) => item.stock > 0).sort((a, b) => b.id - a.id).slice(0, 4);
  const nextEvent = events.find((event) => (event.endDate || event.date) >= todayISO());

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Fabric Painting • Crochet • Handcrafted Fiber Art</p>
          <h1>Every piece begins with color, texture, and patience.</h1>
          <p className="lead">
            Welcome to an artist studio where each piece is shared with care and made to be discussed, collected, and loved.
          </p>
          <div className="actions">
            <Link to="/shop" className="btn btn-large">Shop originals</Link>
            <Link to="/commissions" className="btn btn-large btn-ghost">Commission a piece</Link>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Why buy from the studio">
        <div><HandIcon /><span><strong>Handmade</strong> one piece at a time</span></div>
        <div>
          <TruckIcon />
          <span>
            {settings.freeShippingOver > 0
              ? <><strong>Free shipping</strong> over {formatPrice(settings.freeShippingOver, config.currency)}</>
              : <><strong>Carefully packed</strong> and shipped</>}
          </span>
        </div>
        <div><LockIcon /><span><strong>Secure</strong> checkout</span></div>
      </section>

      {newInShop.length > 0 && (
        <section className="page">
          <div className="section-head">
            <h2>New in the shop</h2>
            <Link to="/shop" className="text-link">Shop all</Link>
          </div>
          <div className="grid">
            {newInShop.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="page">
          <div className="section-head">
            <h2>Featured works</h2>
            <Link to="/portfolio" className="text-link">See the portfolio</Link>
          </div>
          <div className="grid">
            {featured.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}
          </div>
        </section>
      )}

      <section className="page">
        <div className="band">
          <div>
            <p className="eyebrow">Made just for you</p>
            <h2>Commission a one-of-a-kind piece</h2>
            <p>A wall hanging in your home's colours, a blanket for a new baby, a gift that carries a story. Tell me your idea and I'll send you a quote.</p>
          </div>
          <Link to="/commissions" className="btn btn-large">Start a commission</Link>
        </div>
      </section>

      {(posts.length > 0 || nextEvent) && (
        <section className="page home-extras">
          {posts[0] && (
            <article className="card story-card">
              <img src={posts[0].image} alt="" loading="lazy" />
              <div className="card-body">
                <p className="tag">From the journal · {formatDate(posts[0].createdAt)}</p>
                <h3><Link to={`/journal/${posts[0].id}`} className="card-title">{posts[0].title}</Link></h3>
                <p>{posts[0].excerpt}</p>
              </div>
            </article>
          )}
          {nextEvent && (
            <article className="panel event-card">
              <p className="tag">Come say hello</p>
              <h3>{nextEvent.title}</h3>
              <p className="event-date">{formatDateRange(nextEvent.date, nextEvent.endDate)}</p>
              <p className="muted">{nextEvent.location}</p>
              <Link to="/events" className="text-link">All events</Link>
            </article>
          )}
        </section>
      )}

      <section className="page">
        <div className="band band-light">
          <div>
            <h2>Be the first to see new pieces</h2>
            <p className="muted">Handmade work often sells within days. Subscribers hear about new pieces and market dates first.</p>
          </div>
          <NewsletterForm source="home" />
        </div>
      </section>
    </>
  );
}
