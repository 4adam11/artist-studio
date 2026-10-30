import { useState } from 'react';
import { api } from '../api.js';
import { Honeypot } from './Status.jsx';

export default function NewsletterForm({ source, compact = false }) {
  const [status, setStatus] = useState({ state: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: 'sending' });
    try {
      await api.subscribe(data.email, source);
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  if (status.state === 'sent') {
    return <p className="success-text" role="status">Thank you for subscribing! You'll be the first to hear about new pieces.</p>;
  }

  return (
    <form className={`newsletter ${compact ? 'newsletter-compact' : ''}`} onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={`newsletter-${source}`}>Email address</label>
      <input id={`newsletter-${source}`} name="email" type="email" placeholder="Your email" autoComplete="email" required maxLength={200} />
      <Honeypot />
      <button type="submit" className="btn" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Joining…' : 'Subscribe'}
      </button>
      {status.state === 'error' && <p className="error-text" role="alert">{status.message}</p>}
    </form>
  );
}
