import { formatDate } from '../format.js';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { downloadCsv } from './Customers.jsx';
import { Badge, DataState, PageHead } from './ui.jsx';

export function Messages() {
  const { data: messages, reload, ...state } = useAdminData('/messages');
  const { api, refreshCounts } = useAdmin();

  const act = async (fn) => { await fn(); reload(); refreshCounts(); };

  return (
    <div className="admin-page admin-page-narrow">
      <PageHead title="Messages" />
      <DataState {...state} reload={reload}>
        <section className="card card-flush">
          {messages?.length ? messages.map((message) => (
            <article key={message.id} className={`message ${message.read ? '' : 'is-unread'}`}>
              <div className="row-between">
                <strong>{message.name} <Badge>{message.subject}</Badge></strong>
                <span className="muted small">{formatDate(message.createdAt, true)}</span>
              </div>
              {message.orderNumber && <span className="small muted">Order {message.orderNumber}</span>}
              <p>{message.message}</p>
              <div className="button-row" style={{ margin: '0.25rem 0 0' }}>
                <a className="btn btn-small" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}>Reply to {message.email}</a>
                <button type="button" className="btn btn-outline btn-small" onClick={() => act(() => api.patch(`/messages/${message.id}`, { read: !message.read }))}>
                  Mark as {message.read ? 'unread' : 'read'}
                </button>
                <button type="button" className="link-button small" onClick={() => window.confirm('Delete this message?') && act(() => api.remove(`/messages/${message.id}`))}>Delete</button>
              </div>
            </article>
          )) : <p className="muted" style={{ padding: '1.25rem' }}>No messages yet. Messages from the contact form appear here.</p>}
        </section>
      </DataState>
    </div>
  );
}

export function Subscribers() {
  const { data: subscribers, reload, ...state } = useAdminData('/subscribers');
  const { api } = useAdmin();

  return (
    <div className="admin-page admin-page-narrow">
      <PageHead title="Subscribers">
        <button type="button" className="btn btn-outline btn-small" disabled={!subscribers?.length} onClick={() => downloadCsv(api, '/subscribers.csv', 'subscribers.csv')}>Export CSV</button>
      </PageHead>
      <p className="muted small">
        Export the list to send newsletters with any email service. The file includes each subscriber's unsubscribe link; include it in every email.
      </p>
      <DataState {...state} reload={reload}>
        <section className="card card-flush">
          {subscribers?.length ? (
            <table className="table">
              <thead><tr><th>Email</th><th>Source</th><th>Subscribed</th><th /></tr></thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td>{subscriber.email}</td>
                    <td className="muted">{subscriber.source}</td>
                    <td className="muted">{formatDate(subscriber.createdAt)}</td>
                    <td className="num">
                      <button type="button" className="link-button small" onClick={async () => {
                        if (!window.confirm(`Remove ${subscriber.email}?`)) return;
                        await api.remove(`/subscribers/${subscriber.id}`);
                        reload();
                      }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>No subscribers yet.</p>}
        </section>
      </DataState>
    </div>
  );
}
