import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import { usePageTitle } from '../usePageTitle.js';

// Linked from newsletter emails. Asks for a click first so email scanners
// that open links automatically don't unsubscribe people by accident.
export default function Unsubscribe() {
  usePageTitle('Unsubscribe');
  const { token } = useParams();
  const [status, setStatus] = useState({ state: 'idle' });

  async function confirm() {
    setStatus({ state: 'sending' });
    try {
      await api.unsubscribe(token);
      setStatus({ state: 'done' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <section className="page narrow">
      <h1>Unsubscribe</h1>
      {status.state === 'done' ? (
        <>
          <p>You've been unsubscribed and won't receive the studio letter any more. Sorry to see you go!</p>
          <Link to="/" className="text-link">Back to the studio</Link>
        </>
      ) : (
        <>
          <p>Stop receiving the studio letter?</p>
          <button type="button" className="btn" onClick={confirm} disabled={status.state === 'sending'}>Unsubscribe me</button>
          {status.state === 'error' && <p className="error-text">{status.message}</p>}
        </>
      )}
    </section>
  );
}
