import { useState } from 'react';
import { api } from '../api.js';
import { Honeypot } from './Status.jsx';

export default function NewsletterForm({ source }) {
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

  if (status.state === 'sent') return <p role="status">Thanks, you're subscribed.</p>;

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={`newsletter-${source}`}>Email</label>
      <input id={`newsletter-${source}`} name="email" type="email" placeholder="Email" autoComplete="email" required maxLength={200} />
      <Honeypot />
      <button type="submit" className="btn btn-outline" disabled={status.state === 'sending'}>Subscribe</button>
      {status.state === 'error' && <p className="error-text form-full">{status.message}</p>}
    </form>
  );
}
