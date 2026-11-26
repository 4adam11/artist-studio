import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatDate, formatMoney } from '../format.js';
import { matchesQuery } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { Badge, DataState, Field, FulfillmentBadge, PageHead, PaymentBadge } from './ui.jsx';

const FILTERS = [
  ['all', 'All', () => true],
  ['unfulfilled', 'Unfulfilled', (o) => o.status === 'open' && o.fulfillmentStatus === 'unfulfilled'],
  ['unpaid', 'Unpaid', (o) => o.status === 'open' && o.paymentStatus === 'unpaid'],
  ['fulfilled', 'Fulfilled', (o) => o.fulfillmentStatus === 'fulfilled'],
  ['cancelled', 'Cancelled', (o) => o.status === 'cancelled']
];

const customerName = (order) => `${order.customer.firstName} ${order.customer.lastName}`;

export function OrderList() {
  const { data: orders, ...state } = useAdminData('/orders');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const test = FILTERS.find(([id]) => id === filter)[2];
  const visible = (orders || []).filter((order) => test(order) &&
    matchesQuery(query, [`#${order.number}`, String(order.number), customerName(order), order.customer.email]));

  return (
    <div className="admin-page">
      <PageHead title="Orders" />
      <DataState {...state}>
        <section className="card card-flush">
          <div className="table-toolbar">
            <div className="tabs" role="group" aria-label="Filter orders">
              {FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
            </div>
            <input type="search" placeholder="Search by number, name or email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search orders" />
          </div>
          {visible.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Fulfilment</th><th>Items</th><th className="num">Total</th></tr>
                </thead>
                <tbody>
                  {visible.map((order) => (
                    <tr key={order.id} className="is-link" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                      <td><Link to={`/admin/orders/${order.id}`} className="mono">#{order.number}</Link></td>
                      <td className="muted">{formatDate(order.createdAt, true)}</td>
                      <td>{customerName(order)}</td>
                      <td>{order.status === 'cancelled' ? <Badge>Cancelled</Badge> : <PaymentBadge status={order.paymentStatus} />}</td>
                      <td><FulfillmentBadge status={order.fulfillmentStatus} /></td>
                      <td className="muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className="num">{formatMoney(order.total, order.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>{orders?.length ? 'No orders match.' : 'No orders yet.'}</p>}
        </section>
      </DataState>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { api, refreshCounts } = useAdmin();
  const { reload: reloadStore } = useStore();
  const { data: order, setData, ...state } = useAdminData(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      setData(await fn());
      refreshCounts();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <DataState {...state}>
        {order && (
          <>
            <PageHead
              title={<span className="mono">#{order.number}</span>}
              back={['/admin/orders', 'Orders']}
              badges={order.status === 'cancelled'
                ? <Badge tone="danger">Cancelled</Badge>
                : <><PaymentBadge status={order.paymentStatus} /><FulfillmentBadge status={order.fulfillmentStatus} /></>}
            />
            <p className="muted small" style={{ marginTop: '-0.75rem' }}>{formatDate(order.createdAt, true)}</p>
            {error && <p className="error-text" role="alert">{error}</p>}

            <div className="admin-columns">
              <div>
                <OrderItems order={order} />
                {order.status === 'open' && (
                  <>
                    {order.paymentStatus === 'unpaid' && (
                      <section className="card">
                        <h2 className="card-title">Payment</h2>
                        <p className="small muted">Mark the order as paid once you have received the customer's payment.</p>
                        <button type="button" className="btn btn-small" disabled={busy} onClick={() => act(() => api.post(`/orders/${order.id}/mark-paid`))}>Mark as paid</button>
                      </section>
                    )}
                    <Fulfilment order={order} busy={busy} onFulfil={(body) => act(() => api.post(`/orders/${order.id}/fulfill`, body))} />
                  </>
                )}
                <StaffNote order={order} onSave={(staffNote) => act(() => api.patch(`/orders/${order.id}`, { staffNote }))} />
              </div>

              <div>
                <section className="card">
                  <h2 className="card-title">Customer</h2>
                  <dl className="dl">
                    <div><dd>{customerName(order)}</dd><dd><a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Order #${order.number}`)}`} className="text-link">{order.customer.email}</a></dd>{order.customer.phone && <dd>{order.customer.phone}</dd>}</div>
                    <div>
                      <dt>Shipping address</dt>
                      <dd>
                        <address>
                          {customerName(order)}<br />{order.shippingAddress.line1}<br />
                          {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                          {[order.shippingAddress.postalCode, order.shippingAddress.city, order.shippingAddress.region].filter(Boolean).join(' ')}<br />
                          {order.shippingAddress.country}
                        </address>
                      </dd>
                    </div>
                    {order.note && <div><dt>Customer note</dt><dd>{order.note}</dd></div>}
                  </dl>
                </section>
                {order.status === 'open' && (
                  <section className="card">
                    <h2 className="card-title">Cancel order</h2>
                    <p className="small muted">Cancelling puts the items back in stock. Refund any payment yourself.</p>
                    <button
                      type="button"
                      className="btn btn-small btn-danger-outline"
                      disabled={busy}
                      onClick={() => window.confirm(`Cancel order #${order.number} and restock its items?`) &&
                        act(async () => { const result = await api.post(`/orders/${order.id}/cancel`, { restock: true }); await reloadStore(); return result; })}
                    >
                      Cancel order
                    </button>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}

function OrderItems({ order }) {
  const money = (amount) => formatMoney(amount, order.currency);
  return (
    <section className="card">
      <h2 className="card-title">Items</h2>
      <ul className="summary-items">
        {order.items.map((item) => (
          <li key={item.variantId}>
            <span className="summary-thumb">{item.image ? <img src={item.image} alt="" /> : <span className="image-empty" />}<span className="summary-qty">{item.quantity}</span></span>
            <span className="summary-name">
              <Link to={`/admin/products/${item.productId}`} className="text-link">{item.title}</Link>
              <span className="muted small">{[item.variantTitle, item.sku && `SKU ${item.sku}`].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="muted small">{item.quantity} × {money(item.price)}</span>
            <span>{money(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="totals" style={{ marginTop: '1.25rem' }}>
        <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
        {order.discount && <div><dt>Discount <span className="tag">{order.discount.code}</span></dt><dd>{order.discount.type === 'shipping' ? 'Free shipping' : `−${money(order.discount.amount)}`}</dd></div>}
        <div><dt>Shipping ({order.shipping.name})</dt><dd>{order.shipping.price ? money(order.shipping.price) : 'Free'}</dd></div>
        {order.tax > 0 && <div><dt>Tax</dt><dd>{money(order.tax)}</dd></div>}
        <div className="totals-total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
      </dl>
    </section>
  );
}

function Fulfilment({ order, busy, onFulfil }) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const [notify, setNotify] = useState(true);

  if (order.fulfillmentStatus === 'fulfilled') {
    return (
      <section className="card">
        <h2 className="card-title">Fulfilled</h2>
        <p className="small" style={{ margin: 0 }}>
          {order.fulfilledAt && <>Shipped {formatDate(order.fulfilledAt)}. </>}
          {order.trackingNumber ? <>Tracking <span className="mono">{order.trackingNumber}</span></> : 'No tracking number.'}
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="card-title">Fulfil items</h2>
      <form className="form" onSubmit={(event) => { event.preventDefault(); onFulfil({ trackingNumber, trackingUrl, notify }); }}>
        <div className="form-row">
          <Field label="Tracking number (optional)"><input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={100} /></Field>
          <Field label="Tracking link (optional)"><input value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://" maxLength={500} /></Field>
        </div>
        <label className="checkbox-inline"><input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />Send shipping confirmation to the customer</label>
        <div><button type="submit" className="btn btn-small" disabled={busy}>Mark as fulfilled</button></div>
      </form>
    </section>
  );
}

function StaffNote({ order, onSave }) {
  const [note, setNote] = useState(order.staffNote || '');
  return (
    <section className="card">
      <h2 className="card-title">Notes</h2>
      <form className="form" onSubmit={(event) => { event.preventDefault(); onSave(note); }}>
        <label className="visually-hidden" htmlFor="staff-note">Private note</label>
        <textarea id="staff-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Only visible to you" maxLength={5000} />
        {note !== (order.staffNote || '') && <div><button type="submit" className="btn btn-small btn-outline">Save note</button></div>}
      </form>
    </section>
  );
}
