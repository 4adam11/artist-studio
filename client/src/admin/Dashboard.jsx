import { Link, useNavigate } from 'react-router';
import { formatDate, pluralize } from '../format.js';
import { useStore } from '../state/StoreContext.jsx';
import { useAdminData } from './AdminContext.jsx';
import { DataState, FulfillmentBadge, PageHead, PaymentBadge } from './ui.jsx';

export default function Dashboard() {
  const { data: stats, ...state } = useAdminData('/stats');
  const { money } = useStore();
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <PageHead title="Home">
        <Link to="/admin/products/new" className="btn btn-small">Add product</Link>
      </PageHead>
      <DataState {...state}>
        {stats && (
          <>
            <div className="stats">
              <div className="stat"><span className="stat-label">Sales today</span><span className="stat-value">{money(stats.today.sales)}</span><span className="stat-label">{pluralize(stats.today.orders, 'order')}</span></div>
              <div className="stat"><span className="stat-label">Last 7 days</span><span className="stat-value">{money(stats.week.sales)}</span><span className="stat-label">{pluralize(stats.week.orders, 'order')}</span></div>
              <div className="stat"><span className="stat-label">Last 30 days</span><span className="stat-value">{money(stats.month.sales)}</span><span className="stat-label">{pluralize(stats.month.orders, 'order')}</span></div>
              <Link to="/admin/orders" className="stat"><span className="stat-label">To fulfil</span><span className="stat-value">{stats.toFulfill}</span><span className="stat-label">{stats.unpaid} awaiting payment</span></Link>
            </div>

            <div className="admin-columns">
              <div>
                <section className="card card-flush">
                  <h2 className="card-title" style={{ padding: '1.1rem 1.25rem 0' }}>
                    Recent orders <Link to="/admin/orders" className="text-link small">View all</Link>
                  </h2>
                  {stats.recentOrders.length ? (
                    <div className="table-wrap">
                      <table className="table">
                        <tbody>
                          {stats.recentOrders.map((order) => (
                            <tr key={order.id} className="is-link" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                              <td><Link to={`/admin/orders/${order.id}`} className="mono">#{order.number}</Link></td>
                              <td>{order.customer}</td>
                              <td className="muted">{formatDate(order.createdAt)}</td>
                              <td>{order.status === 'cancelled' ? <span className="muted">Cancelled</span> : <PaymentBadge status={order.paymentStatus} />}</td>
                              <td><FulfillmentBadge status={order.fulfillmentStatus} /></td>
                              <td className="num">{money(order.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="muted" style={{ padding: '0 1.25rem 1.25rem' }}>No orders yet. They will appear here as soon as someone checks out.</p>}
                </section>
              </div>

              <div>
                <section className="card">
                  <h2 className="card-title">Low stock</h2>
                  {stats.lowStock.length ? (
                    <div className="order-list">
                      {stats.lowStock.map((item) => (
                        <div key={`${item.productId}-${item.variant}`}>
                          <Link to={`/admin/products/${item.productId}`} className="text-link">{item.title}{item.variant && ` · ${item.variant}`}</Link>
                          <span className={item.stock === 0 ? 'field-error' : 'muted'}>{item.stock === 0 ? 'Sold out' : `${item.stock} left`}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="muted small">Everything is well stocked.</p>}
                </section>

                <section className="card">
                  <h2 className="card-title">Top products, 30 days</h2>
                  {stats.topProducts.length ? (
                    <div className="order-list">
                      {stats.topProducts.map((item) => <div key={item.title}><span>{item.title}</span><span className="muted">{item.quantity} sold</span></div>)}
                    </div>
                  ) : <p className="muted small">No sales yet.</p>}
                </section>
              </div>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
