import { useState } from 'react';
import { api } from '../api.js';
import { Honeypot } from '../components/Status.jsx';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Contact() {
  usePageTitle('Contact');
  const { settings } = useStore();
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      await api.contact(data);
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="container section narrow">
      <header className="page-header">
        <h1>Contact</h1>
        <p className="muted">
          Questions about an order, custom work or wholesale.
          {settings.contactEmail && <> You can also email <a href={`mailto:${settings.contactEmail}`} className="text-link">{settings.contactEmail}</a>.</>}
        </p>
      </header>
      {status.state === 'sent' ? (
        <p role="status">Thanks, your message was sent. We will reply by email.</p>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="field"><span>Name</span><input name="name" autoComplete="name" required maxLength={80} /></label>
            <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Subject</span>
              <select name="subject" defaultValue={settings.contactSubjects?.[0]}>
                {(settings.contactSubjects || []).map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="field"><span>Order number (optional)</span><input name="orderNumber" maxLength={20} /></label>
          </div>
          <label className="field"><span>Message</span><textarea name="message" rows={6} required maxLength={5000} /></label>
          <Honeypot />
          <button type="submit" className="btn" disabled={status.state === 'sending'}>{status.state === 'sending' ? 'Sending…' : 'Send'}</button>
          {status.state === 'error' && <p className="error-text" role="alert">{status.message}</p>}
        </form>
      )}
    </section>
  );
}
