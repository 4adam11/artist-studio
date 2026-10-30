import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { formatPrice } from '../format.js';
import { useCart } from '../state/CartContext.jsx';
import { useFavorites } from '../state/FavoritesContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import CartDrawer from './CartDrawer.jsx';
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon } from './Icons.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import { ErrorNotice, Loading } from './Status.jsx';

const NAV = [
  ['/shop', 'Shop'],
  ['/portfolio', 'Portfolio'],
  ['/commissions', 'Commissions'],
  ['/journal', 'Journal'],
  ['/events', 'Events'],
  ['/about', 'About']
];

export default function Layout() {
  const { status, error, retry } = useStudio();

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      {status === 'ready' && <AnnouncementBar />}
      <Header />
      <main id="main">
        {status === 'loading' && <section className="page"><Loading label="Loading your studio experience…" /></section>}
        {status === 'error' && <section className="page"><ErrorNotice message={error} onRetry={retry} /></section>}
        {status === 'ready' && <Outlet />}
      </main>
      <Footer />
      {status === 'ready' && <CartDrawer />}
    </div>
  );
}

function AnnouncementBar() {
  const { settings, config } = useStudio();
  const text = settings.announcement ||
    (settings.freeShippingOver > 0 ? `Free shipping on orders over ${formatPrice(settings.freeShippingOver, config.currency)}` : '');
  if (!text) return null;
  return <div className="announcement">{text}</div>;
}

function Header() {
  const { count, openDrawer } = useCart();
  const favorites = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  function handleSearch(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q').trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <button type="button" className="icon-button menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="main-nav" aria-label="Menu">
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link to="/" className="brand">Artist Studio</Link>
        <nav id="main-nav" className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main">
          {NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          <NavLink to="/contact" className="nav-mobile-only">Contact</NavLink>
        </nav>
        <div className="header-actions">
          <button type="button" className="icon-button" onClick={() => setSearchOpen((open) => !open)} aria-expanded={searchOpen} aria-label="Search">
            <SearchIcon />
          </button>
          <Link to="/favorites" className="icon-button" aria-label={`Saved items (${favorites.count})`}>
            <HeartIcon />
            {favorites.count > 0 && <span className="icon-badge">{favorites.count}</span>}
          </Link>
          <button type="button" className="icon-button" onClick={openDrawer} aria-label={`Cart (${count} items)`}>
            <BagIcon />
            {count > 0 && <span className="icon-badge">{count}</span>}
          </button>
        </div>
      </div>
      {searchOpen && (
        <form className="header-search" role="search" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor="site-search">Search the studio</label>
          <input id="site-search" name="q" type="search" placeholder="Search pieces, stories, materials…" autoFocus />
          <button type="submit" className="btn">Search</button>
        </form>
      )}
    </header>
  );
}

function Footer() {
  const { status, settings } = useStudio();
  const socials = status === 'ready'
    ? [['Instagram', settings.instagram], ['Facebook', settings.facebook], ['Pinterest', settings.pinterest], ['Etsy', settings.etsy]].filter(([, url]) => url)
    : [];

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-newsletter">
          <h2>Join the studio letter</h2>
          <p className="muted">New pieces, market dates and stories from the studio, a few times a year. No spam, ever.</p>
          <NewsletterForm source="footer" compact />
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            <li><Link to="/shop">All pieces</Link></li>
            <li><Link to="/commissions">Commissions</Link></li>
            <li><Link to="/favorites">Saved items</Link></li>
          </ul>
        </div>
        <div>
          <h3>Studio</h3>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/journal">Journal</Link></li>
            <li><Link to="/events">Events</Link></li>
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><Link to="/shipping-returns">Shipping &amp; returns</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Artist Studio · Handmade with patience</p>
        {socials.length > 0 && (
          <ul className="socials">
            {socials.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noopener noreferrer">{name}</a></li>)}
          </ul>
        )}
        <Link to="/admin" className="footer-link">Studio admin</Link>
      </div>
    </footer>
  );
}
