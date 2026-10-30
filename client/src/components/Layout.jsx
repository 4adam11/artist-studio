import { Link, NavLink, Outlet } from 'react-router';
import { useCart } from '../state/CartContext.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { ErrorNotice, Loading } from './Status.jsx';

export default function Layout() {
  const { status, error, retry } = useStudio();
  const { count } = useCart();

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand">Artist Studio</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/portfolio">Portfolio</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart{count > 0 && <span className="badge" aria-label={`${count} items`}>{count}</span>}
          </NavLink>
        </nav>
      </header>

      <main>
        {status === 'loading' && <section className="page"><Loading label="Loading your studio experience…" /></section>}
        {status === 'error' && <section className="page"><ErrorNotice message={error} onRetry={retry} /></section>}
        {status === 'ready' && <Outlet />}
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Artist Studio · Handmade with patience</p>
        <Link to="/admin" className="footer-link">Studio admin</Link>
      </footer>
    </div>
  );
}
