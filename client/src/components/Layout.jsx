import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useCart } from '../state/CartContext.jsx';
import { useStore } from '../state/StoreContext.jsx';
import CartDrawer from './CartDrawer.jsx';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from './Icons.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import { ErrorNotice, Loading } from './Status.jsx';

export default function Layout() {
  const { status, error, retry } = useStore();

  return (
    <div className="site">
      <a href="#main" className="skip-link">Skip to content</a>
      <Announcement />
      <Header />
      <main id="main">
        {status === 'loading' && <div className="container section"><Loading /></div>}
        {status === 'error' && <div className="container section"><ErrorNotice message={error} onRetry={retry} /></div>}
        {status === 'ready' && <Outlet />}
      </main>
      <Footer />
      {status === 'ready' && <CartDrawer />}
    </div>
  );
}

function Announcement() {
  const { status, settings, money } = useStore();
  if (status !== 'ready') return null;
  const freeRate = settings.shippingRates.find((rate) => rate.freeOver > 0);
  const text = settings.announcement || (freeRate ? `Free ${freeRate.name.toLowerCase()} shipping on orders over ${money(freeRate.freeOver)}` : '');
  return text ? <div className="announcement">{text}</div> : null;
}

function Header() {
  const { settings, collections, pages } = useStore();
  const { count, openDrawer } = useCart();
  const hasAbout = pages.some((page) => page.handle === 'about');
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [pathname]);

  const nav = [['/collections/all', 'Shop all'], ...collections.slice(0, 3).map((c) => [`/collections/${c.handle}`, c.title])];

  return (
    <header className="header">
      <div className="container header-inner">
        <button type="button" className="icon-button menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="site-nav" aria-label="Menu">
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link to="/" className="logo">{settings.storeName}</Link>
        <nav id="site-nav" className={`nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
          {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          {hasAbout && <NavLink to="/pages/about">About</NavLink>}
          <NavLink to="/contact" className="nav-mobile">Contact</NavLink>
        </nav>
        <div className="header-actions">
          <button type="button" className="icon-button" onClick={() => navigate('/search')} aria-label="Search"><SearchIcon /></button>
          <button type="button" className="icon-button cart-button" onClick={openDrawer} aria-label={`Cart, ${count} items`}>
            <BagIcon />
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { status, settings, pages, collections } = useStore();
  if (status !== 'ready') return null;
  const social = Object.entries(settings.social || {});
  const socialNames = { instagram: 'Instagram', facebook: 'Facebook', pinterest: 'Pinterest', tiktok: 'TikTok' };

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h2 className="footer-heading">Shop</h2>
          <ul>
            <li><Link to="/collections/all">All products</Link></li>
            {collections.map((collection) => <li key={collection.id}><Link to={`/collections/${collection.handle}`}>{collection.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="footer-heading">Help</h2>
          <ul>
            {pages.map((page) => <li key={page.handle}><Link to={`/pages/${page.handle}`}>{page.title}</Link></li>)}
            <li><Link to="/orders/lookup">Find your order</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="footer-newsletter">
          <h2 className="footer-heading">Newsletter</h2>
          <p className="muted">New work and restocks, a few times a year.</p>
          <NewsletterForm source="footer" />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {settings.storeName}</span>
        {social.length > 0 && (
          <ul className="inline-list">
            {social.map(([key, url]) => <li key={key}><a href={url} target="_blank" rel="noopener noreferrer">{socialNames[key]}</a></li>)}
          </ul>
        )}
      </div>
    </footer>
  );
}
