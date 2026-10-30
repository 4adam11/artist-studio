import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { adminApi, adminLogin } from '../../api.js';
import { Stars } from '../../components/Stars.jsx';
import { ErrorNotice, Loading } from '../../components/Status.jsx';
import { COMMISSION_STATUS_LABELS, formatDate, formatPrice, ORDER_STATUS_LABELS } from '../../format.js';
import { useStudio } from '../../state/StudioContext.jsx';
import { usePageTitle } from '../../usePageTitle.js';
import { CONTENT_TYPES } from './contentTypes.js';
import ItemEditor from './ItemEditor.jsx';

const SESSION_KEY = 'artist-studio-admin-session';

// [id, label, stats field shown as a badge]
const SECTIONS = [
  ['overview', 'Overview'],
  ['orders', 'Orders', 'ordersToShip'],
  ['commissions', 'Commissions', 'newCommissions'],
  ['products', 'Shop products'],
  ['artworks', 'Portfolio'],
  ['posts', 'Journal'],
  ['events', 'Events'],
  ['discounts', 'Discount codes'],
  ['reviews', 'Reviews', 'pendingReviews'],
  ['messages', 'Messages', 'unreadMessages'],
  ['comments', 'Comments'],
  ['subscribers', 'Subscribers'],
  ['settings', 'Settings']
];

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return session?.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  usePageTitle('Studio admin');
  // The session token (never the password) is kept for this browser tab only.
  const [session, setSession] = useState(readSession);

  const login = (newSession) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession)); } catch { /* storage unavailable */ }
    setSession(newSession);
  };
  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
    setSession(null);
  }, []);

  return session ? <Dashboard token={session.token} onLogout={logout} /> : <Login onLogin={login} />;
}

function Login({ onLogin }) {
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    try {
      onLogin(await adminLogin(new FormData(event.currentTarget).get('password')));
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
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState(null);

  // Any 401 means the session expired: log out instead of showing errors.
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

  const refreshStats = useCallback(() => admin.stats().then(setStats).catch(() => {}), [admin]);
  useEffect(() => { refreshStats(); }, [refreshStats]);

  const props = { admin, refreshStats };

  return (
    <section className="page">
      <div className="section-head">
        <h1>Studio admin</h1>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>Log out</button>
      </div>
      <div className="admin-shell">
        <nav className="admin-nav" role="tablist" aria-label="Admin sections">
          {SECTIONS.map(([id, label, countField]) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>
              {label}
              {countField && stats?.[countField] > 0 && <span className="admin-count">{stats[countField]}</span>}
            </button>
          ))}
        </nav>
        <div>
          {section === 'overview' && <Overview stats={stats} onOpen={setSection} />}
          {CONTENT_TYPES[section] && <ContentTab key={section} type={section} {...props} />}
          {section === 'orders' && <OrdersTab {...props} />}
          {section === 'commissions' && <CommissionsTab {...props} />}
          {section === 'reviews' && <ReviewsTab {...props} />}
          {section === 'messages' && <MessagesTab {...props} />}
          {section === 'comments' && <CommentsTab {...props} />}
          {section === 'subscribers' && <SubscribersTab {...props} />}
          {section === 'settings' && <SettingsTab {...props} />}
        </div>
      </div>
    </section>
  );
}

function Overview({ stats, onOpen }) {
  const { config } = useStudio();
  if (!stats) return <Loading />;
  const money = (amount) => formatPrice(amount, config.currency);

  const tiles = [
    [money(stats.revenueThisMonth), `Sales this month (${stats.ordersThisMonth} orders)`],
    [money(stats.revenueAllTime), 'Sales all time'],
    [stats.ordersToShip, 'Orders to ship', 'orders', stats.ordersToShip > 0],
    [stats.newCommissions, 'New commission requests', 'commissions', stats.newCommissions > 0],
    [stats.unreadMessages, 'Unread messages', 'messages', stats.unreadMessages > 0],
    [stats.pendingReviews, 'Reviews to approve', 'reviews', stats.pendingReviews > 0],
    [stats.subscribers, 'Newsletter subscribers', 'subscribers'],
    [stats.waitingForStock, 'Waiting for restocks', 'subscribers']
  ];

  return (
    <div>
      <h2>Overview</h2>
      <div className="stat-grid">
        {tiles.map(([value, label, target, alert]) => (
          <div key={label} className={`stat ${alert ? 'stat-alert' : ''}`}>
            <strong>{value}</strong>
            {target ? <button type="button" className="link-button" onClick={() => onOpen(target)}>{label}</button> : <span>{label}</span>}
          </div>
        ))}
      </div>

      {stats.lowStock.length > 0 && (
        <div className="panel">
          <h3>Low stock</h3>
          <ul className="link-list">
            {stats.lowStock.map((product) => (
              <li key={product.id}>
                <Link to={`/shop/${product.id}`} className="text-link">{product.title}</Link>: {product.stock === 0 ? 'sold out' : `${product.stock} left`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <div className="section-head">
          <h3>Recent orders</h3>
          <button type="button" className="link-button" onClick={() => onOpen('orders')}>All orders</button>
        </div>
        {stats.recentOrders.length ? (
          <ul className="summary-list">
            {stats.recentOrders.map((order) => (
              <li key={order.id}>
                <span>#{order.id} · {order.name} · {formatDate(order.createdAt)}</span>
                <span><span className="status-pill">{ORDER_STATUS_LABELS[order.status]}</span> {money(order.total)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No orders yet.</p>}
      </div>
    </div>
  );
}

function useAdminList(admin, collection, refreshStats) {
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

  // Runs a change, then reloads the list and the counters (or shows the error).
  const act = async (fn) => {
    try {
      await fn();
      await refresh();
      refreshStats?.();
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

const confirmThen = (message, fn) => () => window.confirm(message) && fn();

function ContentTab({ type, admin, refreshStats }) {
  const studio = useStudio();
  const { items, error, refresh, act } = useAdminList(admin, type, refreshStats);
  const [editing, setEditing] = useState(null);
  const { label, singular, summary, reloadsSite, titleField = 'title' } = CONTENT_TYPES[type];
  const categories = [...new Set([...studio.artworks, ...studio.products].map((item) => item.category))];
  const money = (amount) => formatPrice(amount, studio.config.currency);

  async function save(values) {
    if (editing.id) await admin.update(type, editing.id, values);
    else await admin.create(type, values);
    await refresh();
    if (reloadsSite) await studio.reload();
    refreshStats();
    setEditing(null);
  }

  const remove = (item) => act(async () => {
    await admin.remove(type, item.id);
    if (reloadsSite) await studio.reload();
  });

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
      <ListState items={items} error={error} refresh={refresh} empty="Nothing here yet." />
      <div className="admin-list">
        {items?.map((item) => (
          <div key={item.id} className="admin-row">
            {item.image && <img src={item.image} alt="" className="cart-thumb" />}
            <div className="admin-row-main">
              <strong>{item[titleField]}</strong>
              <span className="muted small">{summary(item, money)}</span>
            </div>
            <button type="button" className="chip" onClick={() => { setEditing(item); window.scrollTo(0, 0); }}>Edit</button>
            <button type="button" className="chip chip-danger" onClick={confirmThen(`Delete "${item[titleField]}"? This cannot be undone.`, () => remove(item))}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ admin, refreshStats }) {
  const { config } = useStudio();
  const { items, error, refresh, act } = useAdminList(admin, 'orders', refreshStats);
  const [filter, setFilter] = useState('open');
  const money = (amount) => formatPrice(amount, config.currency);
  const visible = items?.filter((order) => filter === 'all' || ['paid', 'received'].includes(order.status));

  return (
    <div>
      <div className="section-head">
        <h2>Orders</h2>
        <div className="filter-row">
          <button type="button" className={`chip ${filter === 'open' ? 'chip-active' : ''}`} onClick={() => setFilter('open')}>To ship</button>
          <button type="button" className={`chip ${filter === 'all' ? 'chip-active' : ''}`} onClick={() => setFilter('all')}>All orders</button>
        </div>
      </div>
      <ListState items={visible} error={error} refresh={refresh} empty={filter === 'open' ? 'Nothing waiting to ship. 🎉' : 'No orders yet.'} />
      <div className="admin-list">
        {!error && visible?.map((order) => (
          <article key={order.id} className="panel admin-card">
            <div className="section-head">
              <strong>#{order.id} · {order.name} · {money(order.total)}</strong>
              <select
                value={order.status}
                onChange={(event) => act(() => admin.patch('orders', order.id, { status: event.target.value }))}
                aria-label={`Status of order ${order.id}`}
              >
                {Object.entries(ORDER_STATUS_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <p className="muted small">
              {formatDate(order.createdAt)} · <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Artist Studio order #${order.id}`)}`}>{order.email}</a>
              {order.phone && ` · ${order.phone}`}
            </p>
            <ul className="summary-list">
              {order.items.map((item) => (
                <li key={item.productId}><span>{item.quantity} × {item.title}</span><span>{money(item.price * item.quantity)}</span></li>
              ))}
            </ul>
            {order.discount && <p className="small">Discount {order.discount.code}: −{money(order.discount.amount)}</p>}
            {order.shipping !== undefined && <p className="small">Shipping: {order.shipping ? money(order.shipping) : 'free'}</p>}
            {order.address && (
              <address className="address small">
                <strong>Ship to:</strong> {order.name}, {order.address.line1}{order.address.line2 && `, ${order.address.line2}`},{' '}
                {[order.address.city, order.address.region, order.address.postalCode].filter(Boolean).join(' ')}, {order.address.country}
              </address>
            )}
            {order.note && <p><em>Note:</em> {order.note}</p>}
            <ShipForm order={order} onShip={(trackingNumber) => act(() => admin.patch('orders', order.id, { status: 'shipped', trackingNumber }))} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ShipForm({ order, onShip }) {
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  if (order.status === 'shipped') {
    return <p className="small success-text">Shipped{order.trackingNumber ? ` · tracking ${order.trackingNumber}` : ''}</p>;
  }
  if (!['paid', 'received'].includes(order.status)) return null;
  return (
    <form className="inline-form" onSubmit={(event) => { event.preventDefault(); onShip(tracking); }}>
      <label className="visually-hidden" htmlFor={`tracking-${order.id}`}>Tracking number</label>
      <input id={`tracking-${order.id}`} value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Tracking number (optional)" maxLength={100} />
      <button type="submit" className="btn btn-small">Mark shipped &amp; email buyer</button>
    </form>
  );
}

function CommissionsTab({ admin, refreshStats }) {
  const { items, error, refresh, act } = useAdminList(admin, 'commissions', refreshStats);

  return (
    <div>
      <h2>Commission requests</h2>
      <ListState items={items} error={error} refresh={refresh} empty="No commission requests yet." />
      <div className="admin-list">
        {!error && items?.map((request) => (
          <article key={request.id} className={`panel admin-card ${request.status === 'new' ? 'unread' : ''}`}>
            <div className="section-head">
              <strong>{request.type} for {request.name}</strong>
              <select
                value={request.status}
                onChange={(event) => act(() => admin.patch('commissions', request.id, { status: event.target.value }))}
                aria-label={`Status of request from ${request.name}`}
              >
                {Object.entries(COMMISSION_STATUS_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <p className="muted small">{formatDate(request.createdAt)} · <a href={`mailto:${request.email}?subject=${encodeURIComponent('Your commission request')}`}>{request.email}</a></p>
            <dl className="request-facts">
              {[['Size', request.size], ['Colours', request.colors], ['Budget', request.budget], ['Needed by', request.deadline]].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>
              ))}
            </dl>
            <p className="pre-wrap">{request.details}</p>
            {request.references.length > 0 && (
              <div className="reference-photos">
                {request.references.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Reference" /></a>)}
              </div>
            )}
            <NoteEditor value={request.note} onSave={(note) => act(() => admin.patch('commissions', request.id, { note }))} />
            <button type="button" className="chip chip-danger" onClick={confirmThen('Delete this request and its photos?', () => act(() => admin.remove('commissions', request.id)))}>Delete</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function NoteEditor({ value, onSave }) {
  const [note, setNote] = useState(value || '');
  return (
    <form className="form-flat" onSubmit={(event) => { event.preventDefault(); onSave(note); }}>
      <label className="small">
        Private notes (quote, timeline…)
        <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} />
      </label>
      {note !== (value || '') && <button type="submit" className="btn btn-small">Save note</button>}
    </form>
  );
}

function ReviewsTab({ admin, refreshStats }) {
  const { items, error, refresh, act } = useAdminList(admin, 'reviews', refreshStats);
  const studio = useStudio();
  const change = (fn) => act(async () => { await fn(); await studio.reload(); });

  return (
    <div>
      <h2>Reviews</h2>
      <p className="muted">New reviews appear on the site only after you approve them.</p>
      <ListState items={items} error={error} refresh={refresh} empty="No reviews yet." />
      <div className="admin-list">
        {!error && items?.map((review) => (
          <article key={review.id} className={`panel admin-card ${review.approved ? '' : 'unread'}`}>
            <div className="section-head">
              <span><Stars value={review.rating} size="small" /> <strong>{review.title || review.productTitle}</strong></span>
              <span className="status-pill">{review.approved ? 'Visible' : 'Waiting for approval'}</span>
            </div>
            <p className="pre-wrap">{review.body}</p>
            <p className="muted small">
              {review.name} ({review.email}){review.verified && ' · ✓ verified buyer'} · on {review.productTitle} · {formatDate(review.createdAt)}
            </p>
            <div className="actions actions-left">
              <button type="button" className="btn btn-small" onClick={() => change(() => admin.patch('reviews', review.id, { approved: !review.approved }))}>
                {review.approved ? 'Hide' : 'Approve'}
              </button>
              <button type="button" className="chip chip-danger" onClick={confirmThen('Delete this review?', () => change(() => admin.remove('reviews', review.id)))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MessagesTab({ admin, refreshStats }) {
  const { items, error, refresh, act } = useAdminList(admin, 'messages', refreshStats);

  return (
    <div>
      <h2>Messages</h2>
      <ListState items={items} error={error} refresh={refresh} empty="No messages yet." />
      <div className="admin-list">
        {!error && items?.map((message) => (
          <article key={message.id} className={`panel admin-card ${message.read ? '' : 'unread'}`}>
            <div className="section-head">
              <strong>{message.name}</strong>
              <span className="muted small">{formatDate(message.createdAt)}</span>
            </div>
            <p className="pre-wrap">{message.message}</p>
            <div className="actions actions-left">
              <a className="btn btn-small" href={`mailto:${message.email}?subject=${encodeURIComponent('Re: your message to Artist Studio')}`}>Reply to {message.email}</a>
              <button type="button" className="chip" onClick={() => act(() => admin.patch('messages', message.id, { read: !message.read }))}>
                Mark as {message.read ? 'unread' : 'read'}
              </button>
              <button type="button" className="chip chip-danger" onClick={confirmThen('Delete this message?', () => act(() => admin.remove('messages', message.id)))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CommentsTab({ admin, refreshStats }) {
  const { items, error, refresh, act } = useAdminList(admin, 'comments', refreshStats);

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
            <button type="button" className="chip chip-danger" onClick={confirmThen('Delete this comment?', () => act(() => admin.remove('comments', comment.id)))}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscribersTab({ admin, refreshStats }) {
  const subscribers = useAdminList(admin, 'subscribers', refreshStats);
  const alerts = useAdminList(admin, 'stockAlerts', refreshStats);
  const [downloadError, setDownloadError] = useState(null);

  async function download() {
    setDownloadError(null);
    try {
      const blob = await admin.downloadSubscribers();
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: 'subscribers.csv' });
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error.message);
    }
  }

  const waiting = alerts.items?.filter((alert) => !alert.notifiedAt);

  return (
    <div>
      <div className="section-head">
        <h2>Newsletter subscribers</h2>
        <button type="button" className="btn" onClick={download} disabled={!subscribers.items?.length}>Download CSV</button>
      </div>
      <p className="muted">
        Download the list to send your newsletter with any email service (Mailchimp, Buttondown, Gmail…). The file includes
        each person's personal unsubscribe link; please include it in every newsletter.
      </p>
      {downloadError && <ErrorNotice message={downloadError} />}
      <ListState {...subscribers} empty="No subscribers yet." />
      <div className="admin-list">
        {!subscribers.error && subscribers.items?.map((subscriber) => (
          <div key={subscriber.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{subscriber.email}</strong>
              <span className="muted small">Joined {formatDate(subscriber.createdAt)}{subscriber.source && ` · from ${subscriber.source}`}</span>
            </div>
            <button type="button" className="chip chip-danger" onClick={confirmThen(`Remove ${subscriber.email}?`, () => subscribers.act(() => admin.remove('subscribers', subscriber.id)))}>Remove</button>
          </div>
        ))}
      </div>

      <h2 className="form-section">Waiting for a restock</h2>
      <p className="muted">These people are emailed automatically when you set the product's stock above zero.</p>
      <ListState items={waiting} error={alerts.error} refresh={alerts.refresh} empty="Nobody is waiting right now." />
      <div className="admin-list">
        {waiting?.map((alert) => (
          <div key={alert.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{alert.email}</strong>
              <span className="muted small">wants {alert.productTitle} · since {formatDate(alert.createdAt)}</span>
            </div>
            <button type="button" className="chip chip-danger" onClick={() => alerts.act(() => admin.remove('stockAlerts', alert.id))}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SETTINGS_FIELDS = [
  ['Shipping', [
    ['shippingFlat', 'Shipping cost per order', 'number'],
    ['freeShippingOver', 'Free shipping on orders over (0 = never)', 'number'],
    ['processingTime', 'Processing time (shown on product pages)'],
    ['shipsTo', 'Where you ship (shown on product pages)']
  ]],
  ['Site', [
    ['announcement', 'Announcement bar (leave empty to show the free-shipping offer)'],
    ['siteDescription', 'Site description for search engines and link previews'],
    ['contactEmail', 'Public contact email', 'email']
  ]],
  ['Social links', [
    ['instagram', 'Instagram link', 'url'],
    ['facebook', 'Facebook link', 'url'],
    ['pinterest', 'Pinterest link', 'url'],
    ['etsy', 'Etsy shop link', 'url']
  ]]
];

function SettingsTab({ admin }) {
  const studio = useStudio();
  const [values, setValues] = useState(null);
  const [status, setStatus] = useState({ state: 'idle' });

  useEffect(() => {
    admin.getSettings().then(setValues).catch((error) => setStatus({ state: 'error', message: error.message }));
  }, [admin]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ state: 'saving' });
    try {
      const payload = { ...values, shippingFlat: Number(values.shippingFlat), freeShippingOver: Number(values.freeShippingOver) };
      setValues(await admin.saveSettings(payload));
      await studio.reload();
      setStatus({ state: 'saved' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  if (!values) return status.state === 'error' ? <ErrorNotice message={status.message} /> : <Loading />;

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Settings</h2>
      {SETTINGS_FIELDS.map(([group, fields]) => (
        <fieldset key={group} className="image-field">
          <legend>{group}</legend>
          {fields.map(([name, label, type = 'text']) => (
            <label key={name}>
              {label}
              <input
                type={type}
                min={type === 'number' ? 0 : undefined}
                step={type === 'number' ? 0.01 : undefined}
                value={values[name] ?? ''}
                onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))}
                placeholder={type === 'url' ? 'https://…' : undefined}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <div className="actions actions-left">
        <button type="submit" className="btn" disabled={status.state === 'saving'}>{status.state === 'saving' ? 'Saving…' : 'Save settings'}</button>
      </div>
      <div aria-live="polite">
        {status.state === 'saved' && <p className="success-text">Settings saved.</p>}
        {status.state === 'error' && <p className="error-text">{status.message}</p>}
      </div>
    </form>
  );
}
