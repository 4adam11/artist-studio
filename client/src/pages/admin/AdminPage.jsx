import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api.js';
import { ErrorNotice, Loading } from '../../components/Status.jsx';
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '../../format.js';
import { useStudio } from '../../state/StudioContext.jsx';
import { usePageTitle } from '../../usePageTitle.js';
import { CONTENT_TYPES } from './contentTypes.js';
import ItemEditor from './ItemEditor.jsx';

const TOKEN_KEY = 'artist-studio-admin';

const TABS = [
  ['artworks', 'Artworks'],
  ['products', 'Shop'],
  ['orders', 'Orders'],
  ['messages', 'Messages'],
  ['comments', 'Comments']
];

export default function AdminPage() {
  usePageTitle('Studio admin');
  // Kept for this browser tab only, so closing the tab logs you out.
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });

  const login = (password) => {
    try { sessionStorage.setItem(TOKEN_KEY, password); } catch { /* storage unavailable */ }
    setToken(password);
  };
  const logout = useCallback(() => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
    setToken('');
  }, []);

  return token ? <Dashboard token={token} onLogout={logout} /> : <Login onLogin={login} />;
}

function Login({ onLogin }) {
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get('password');
    setChecking(true);
    setError(null);
    try {
      await adminApi(password).checkSession();
      onLogin(password);
    } catch (loginError) {
      setError(loginError.message);
      setChecking(false);
    }
  }

  return (
    <section className="page narrow">
      <h1>Studio admin</h1>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Admin password
          <input name="password" type="password" autoComplete="current-password" required autoFocus />
        </label>
        <button type="submit" className="btn" disabled={checking}>{checking ? 'Checking…' : 'Log in'}</button>
        {error && <p className="error-text" role="alert">{error}</p>}
      </form>
    </section>
  );
}

function Dashboard({ token, onLogout }) {
  const [tab, setTab] = useState('artworks');
  // Any 401 means the password changed on the server: log out instead of showing errors.
  const admin = useMemo(() => {
    const raw = adminApi(token);
    return Object.fromEntries(Object.entries(raw).map(([name, fn]) => [name, async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error.status === 401) onLogout();
        throw error;
      }
    }]));
  }, [token, onLogout]);

  return (
    <section className="page">
      <div className="section-head">
        <h1>Studio admin</h1>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>Log out</button>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`chip ${tab === id ? 'chip-active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {(tab === 'artworks' || tab === 'products') && <ContentTab key={tab} type={tab} admin={admin} />}
      {tab === 'orders' && <OrdersTab admin={admin} />}
      {tab === 'messages' && <MessagesTab admin={admin} />}
      {tab === 'comments' && <CommentsTab admin={admin} />}
    </section>
  );
}

function ContentTab({ type, admin }) {
  const studio = useStudio();
  const { config, reload } = studio;
  const items = studio[type];
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const categories = [...new Set([...studio.artworks, ...studio.products].map((item) => item.category))];
  const { label, singular } = CONTENT_TYPES[type];

  async function save(values) {
    if (editing.id) await admin.update(type, editing.id, values);
    else await admin.create(type, values);
    await reload();
    setEditing(null);
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await admin.remove(type, item.id);
      await reload();
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  return (
    <div>
      <div className="section-head">
        <h2>{label}</h2>
        {!editing && <button type="button" className="btn" onClick={() => setEditing({})}>Add {singular}</button>}
      </div>
      {editing && (
        <ItemEditor
          key={editing.id || 'new'}
          type={type}
          item={editing}
          categories={categories}
          admin={admin}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
      {error && <ErrorNotice message={error} />}
      <div className="admin-list">
        {items.map((item) => (
          <div key={item.id} className="admin-row">
            <img src={item.image} alt="" className="cart-thumb" />
            <div className="admin-row-main">
              <strong>{item.title}</strong>
              <span className="muted small">
                {item.category}
                {type === 'products' && ` · ${formatPrice(item.price, config.currency)} · ${item.stock > 0 ? `${item.stock} in stock` : 'sold out'}`}
                {type === 'artworks' && item.featured && ' · featured'}
              </span>
            </div>
            <button type="button" className="chip" onClick={() => setEditing(item)}>Edit</button>
            <button type="button" className="chip chip-danger" onClick={() => remove(item)}>Delete</button>
          </div>
        ))}
        {!items.length && <p className="muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

function useAdminList(admin, collection) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setItems(await admin.list(collection));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [admin, collection]);

  useEffect(() => { refresh(); }, [refresh]);

  // Runs a change, then reloads the list (or shows the error).
  const act = async (fn) => {
    try {
      await fn();
      await refresh();
    } catch (actError) {
      setError(actError.message);
    }
  };

  return { items, error, refresh, act };
}

function ListState({ items, error, refresh, empty }) {
  if (error) return <ErrorNotice message={error} onRetry={refresh} />;
  if (!items) return <Loading />;
  if (!items.length) return <p className="muted">{empty}</p>;
  return null;
}

function OrdersTab({ admin }) {
  const { config } = useStudio();
  const { items, error, refresh, act } = useAdminList(admin, 'orders');

  return (
    <div>
      <h2>Orders</h2>
      <ListState items={items} error={error} refresh={refresh} empty="No orders yet." />
      <div className="admin-list">
        {!error && items?.map((order) => (
          <article key={order.id} className="panel admin-card">
            <div className="section-head">
              <strong>#{order.id} · {order.name} · {formatPrice(order.total, config.currency)}</strong>
              <select
                value={order.status}
                onChange={(event) => act(() => admin.setOrderStatus(order.id, event.target.value))}
                aria-label={`Status of order ${order.id}`}
              >
                {Object.entries(ORDER_STATUS_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <p className="muted small">
              {formatDate(order.createdAt)} · <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Artist Studio order #${order.id}`)}`}>{order.email}</a>
            </p>
            <ul className="summary-list">
              {order.items.map((item) => (
                <li key={item.productId}><span>{item.quantity} × {item.title}</span><span>{formatPrice(item.price * item.quantity, config.currency)}</span></li>
              ))}
            </ul>
            {order.note && <p><em>Note:</em> {order.note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

function MessagesTab({ admin }) {
  const { items, error, refresh, act } = useAdminList(admin, 'messages');

  return (
    <div>
      <h2>Messages</h2>
      <ListState items={items} error={error} refresh={refresh} empty="No messages yet." />
      <div className="admin-list">
        {!error && items?.map((message) => (
          <article key={message.id} className={`panel admin-card ${message.read ? '' : 'unread'}`}>
            <div className="section-head">
              <strong>{message.read ? '' : '● '}{message.name}</strong>
              <span className="muted small">{formatDate(message.createdAt)}</span>
            </div>
            <p className="pre-wrap">{message.message}</p>
            <div className="actions actions-left">
              <a className="btn btn-small" href={`mailto:${message.email}?subject=${encodeURIComponent('Re: your message to Artist Studio')}`}>Reply to {message.email}</a>
              <button type="button" className="chip" onClick={() => act(() => admin.setMessageRead(message.id, !message.read))}>
                Mark as {message.read ? 'unread' : 'read'}
              </button>
              <button
                type="button"
                className="chip chip-danger"
                onClick={() => window.confirm('Delete this message?') && act(() => admin.remove('messages', message.id))}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CommentsTab({ admin }) {
  const { items, error, refresh, act } = useAdminList(admin, 'comments');

  return (
    <div>
      <h2>Comments</h2>
      <ListState items={items} error={error} refresh={refresh} empty="No comments yet." />
      <div className="admin-list">
        {!error && items?.map((comment) => (
          <div key={comment.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{comment.name}</strong>
              <span className="muted small">on {comment.artworkTitle} · {formatDate(comment.createdAt)}</span>
              <p>{comment.message}</p>
            </div>
            <button
              type="button"
              className="chip chip-danger"
              onClick={() => window.confirm('Delete this comment?') && act(() => admin.remove('comments', comment.id))}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
