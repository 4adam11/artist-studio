import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { CloseIcon, MenuIcon } from '../components/Icons.jsx';
import { useStore } from '../state/StoreContext.jsx';
import { AdminProvider, useAdmin } from './AdminContext.jsx';
import { CollectionEditor, CollectionList } from './Collections.jsx';
import Customers from './Customers.jsx';
import Dashboard from './Dashboard.jsx';
import Discounts from './Discounts.jsx';
import { Messages, Subscribers } from './Inbox.jsx';
import { OrderDetail, OrderList } from './Orders.jsx';
import { PageEditor, PageList } from './Pages.jsx';
import ProductEditor from './ProductEditor.jsx';
import ProductList from './Products.jsx';
import Settings from './Settings.jsx';

export default function Admin() {
  return (
    <AdminProvider>
      <AdminGate />
    </AdminProvider>
  );
}

function AdminGate() {
  const { session } = useAdmin();
  const { settings } = useStore();
  useEffect(() => {
    document.title = `Admin · ${settings.storeName || 'Store'}`;
  }, [settings.storeName]);
  return session ? <AdminLayout /> : <Login />;
}

function Login() {
  const { login } = useAdmin();
  const { settings } = useStore();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(new FormData(event.currentTarget).get('password'));
    } catch (loginError) {
      setError(loginError.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <h1 className="card-title" style={{ fontSize: '1.1rem' }}>{settings.storeName || 'Store'} admin</h1>
          <p className="muted small" style={{ margin: 0 }}>Log in to manage products and orders.</p>
        </div>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required autoFocus />
        </label>
        <button type="submit" className="btn btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        {error && <p className="error-text" role="alert">{error}</p>}
        <Link to="/" className="back-link">← Back to store</Link>
      </form>
    </div>
  );
}

const NAV = [
  ['', 'Home'],
  ['orders', 'Orders', 'toFulfill'],
  ['products', 'Products'],
  ['collections', 'Collections'],
  ['customers', 'Customers'],
  ['discounts', 'Discounts'],
  ['group', 'Content'],
  ['pages', 'Pages'],
  ['messages', 'Messages', 'unreadMessages'],
  ['subscribers', 'Subscribers'],
  ['group', 'Store'],
  ['settings', 'Settings']
];

function AdminLayout() {
  const { logout, counts, refreshCounts } = useAdmin();
  const { settings } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    refreshCounts();
  }, [pathname, refreshCounts]);

  return (
    <div className="admin">
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <Link to="/admin">{settings.storeName || 'Store'}</Link>
          {menuOpen && (
            <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <CloseIcon size={18} />
            </button>
          )}
        </div>
        <nav className="admin-nav" aria-label="Admin">
          {NAV.map(([path, label, countKey], index) => (path === 'group'
            ? <div key={index} className="admin-nav-group">{label}</div>
            : (
              <NavLink key={path} to={`/admin${path && `/${path}`}`} end={!path}>
                {label}
                {countKey && counts[countKey] > 0 && <span className="admin-count">{counts[countKey]}</span>}
              </NavLink>
            )))}
        </nav>
        <div className="admin-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer">View store ↗</a>
          <button type="button" onClick={logout}>Log out</button>
        </div>
      </aside>

      <div>
        <div className="admin-mobile-bar">
          <button type="button" className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><MenuIcon /></button>
          <strong>{settings.storeName}</strong>
        </div>
        <main className="admin-main">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="collections" element={<CollectionList />} />
            <Route path="collections/:id" element={<CollectionEditor />} />
            <Route path="customers" element={<Customers />} />
            <Route path="discounts" element={<Discounts />} />
            <Route path="pages" element={<PageList />} />
            <Route path="pages/:id" element={<PageEditor />} />
            <Route path="messages" element={<Messages />} />
            <Route path="subscribers" element={<Subscribers />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<p>Page not found. <Link to="/admin" className="text-link">Go to admin home</Link></p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
