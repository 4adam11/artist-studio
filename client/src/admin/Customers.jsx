import { useState } from 'react';
import { Link } from 'react-router';
import { formatDate } from '../format.js';
import { matchesQuery } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { DataState, PageHead } from './ui.jsx';

// Downloads an admin CSV export (it needs the session token, so a plain link won't do).
export async function downloadCsv(api, path, fileName) {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: fileName }).click();
  URL.revokeObjectURL(url);
}

export default function Customers() {
  const { data: customers, ...state } = useAdminData('/customers');
  const { api } = useAdmin();
  const { money } = useStore();
  const [query, setQuery] = useState('');
  const visible = (customers || []).filter((customer) => matchesQuery(query, [customer.name, customer.email, customer.location]));

  return (
    <div className="admin-page">
      <PageHead title="Customers">
        <button type="button" className="btn btn-outline btn-small" disabled={!customers?.length} onClick={() => downloadCsv(api, '/customers.csv', 'customers.csv')}>Export CSV</button>
      </PageHead>
      <DataState {...state}>
        <section className="card card-flush">
          <div className="table-toolbar">
            <input type="search" placeholder="Search customers" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search customers" />
          </div>
          {visible.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Customer</th><th>Location</th><th>Orders</th><th>Last order</th><th>Newsletter</th><th className="num">Spent</th></tr></thead>
                <tbody>
                  {visible.map((customer) => (
                    <tr key={customer.email}>
                      <td>
                        {customer.name}<br />
                        <a href={`mailto:${customer.email}`} className="muted small">{customer.email}</a>
                      </td>
                      <td className="muted">{customer.location}</td>
                      <td>
                        {customer.orderIds.map((orderId, index) => (
                          <span key={orderId}>{index > 0 && ', '}<Link to={`/admin/orders/${orderId}`} className="mono small">#{1000 + orderId}</Link></span>
                        ))}
                      </td>
                      <td className="muted">{formatDate(customer.lastOrderAt)}</td>
                      <td className="muted">{customer.subscribed ? 'Subscribed' : ''}</td>
                      <td className="num">{money(customer.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>{customers?.length ? 'No customers match.' : 'Customers appear here after their first order.'}</p>}
        </section>
      </DataState>
    </div>
  );
}
