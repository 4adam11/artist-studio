import { useState } from 'react';
import { api } from '../api.js';
import { Honeypot } from '../components/Status.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Contact() {
  usePageTitle('Contact');
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      await api.sendContact(data);
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="page narrow">
      <h1>Contact</h1>
      <p>For commissions, collaborations, or questions, send a note here.</p>
      {status.state === 'sent' ? (
        <p className="success-text" role="status">Thank you, your message has been received. I'll reply by email soon.</p>
      ) : (
        <form className="form-card" onSubmit={handleSubmit}>
          <label>
            Your name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
          <label>
            Your email
            <input name="email" type="email" autoComplete="email" maxLength={200} required />
          </label>
          <label>
            Message
            <textarea name="message" rows={5} maxLength={5000} required />
          </label>
          <Honeypot />
          <button className="btn" type="submit" disabled={status.state === 'sending'}>
            {status.state === 'sending' ? 'Sending…' : 'Send'}
          </button>
          <div aria-live="polite">
            {status.state === 'error' && <p className="error-text">{status.message}</p>}
          </div>
        </form>
      )}
    </section>
  );
}
