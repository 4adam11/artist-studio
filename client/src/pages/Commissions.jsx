import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { Honeypot } from '../components/Status.jsx';
import { todayISO } from '../format.js';
import { usePageTitle } from '../usePageTitle.js';

const STEPS = [
  ['Share your idea', 'Tell me what you have in mind: the piece, the size, the colours and who it is for.'],
  ['Get a quote', 'I reply within a few days with questions, a price and a timeline. No obligation.'],
  ['Watch it come to life', 'Once you say yes, I send progress photos as the piece takes shape.'],
  ['Delivered with care', 'Your finished piece is packed by hand and shipped to your door.']
];

const TYPES = ['Fabric painting / wall hanging', 'Crochet blanket or throw', 'Crochet accessory', 'Woven or fiber sculpture', 'Something else'];
const BUDGETS = ['Under 100', '100 – 250', '250 – 500', '500+', 'Not sure yet'];

export default function Commissions() {
  usePageTitle('Commissions');
  const [params] = useSearchParams();
  const reference = params.get('ref');
  const [status, setStatus] = useState({ state: 'idle' });
  const [fileNames, setFileNames] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.getAll('references').filter((file) => file.size > 0).length === 0) form.delete('references');
    setStatus({ state: 'sending' });
    try {
      await api.sendCommission(form);
      setStatus({ state: 'sent' });
      window.scrollTo(0, 0);
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  function handleFiles(event) {
    const files = [...event.target.files];
    if (files.length > 3) {
      event.target.value = '';
      setFileNames([]);
      setStatus({ state: 'error', message: 'Please choose up to 3 photos.' });
      return;
    }
    setFileNames(files.map((file) => file.name));
  }

  if (status.state === 'sent') {
    return (
      <section className="page narrow">
        <p className="eyebrow">Commissions</p>
        <h1>Thank you, your idea is on its way!</h1>
        <p className="lead">I read every request personally and will reply by email within a few days with questions, a quote and a timeline.</p>
        <Link to="/portfolio" className="btn">Browse the portfolio while you wait</Link>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-intro narrow-text">
        <p className="eyebrow">Commissions</p>
        <h1>Have a piece made just for you</h1>
        <p className="lead">
          From wall hangings painted in your home's colours to heirloom blankets for someone you love, commissions are
          made from scratch, around your story.
        </p>
      </div>

      <ol className="steps">
        {STEPS.map(([title, text], index) => (
          <li key={title}>
            <span className="step-number">{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <form className="form-card commission-form" onSubmit={handleSubmit}>
        <h2>Tell me about your idea</h2>
        <div className="form-row">
          <label>
            Your name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" maxLength={200} required />
          </label>
        </div>
        <label>
          What would you like made?
          <select name="type" required defaultValue="">
            <option value="" disabled>Choose one…</option>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <div className="form-row">
          <label>
            Approximate size <span className="muted">(optional)</span>
            <input name="size" maxLength={120} placeholder="e.g. 60 × 90 cm, or a single bed" />
          </label>
          <label>
            Colours <span className="muted">(optional)</span>
            <input name="colors" maxLength={200} placeholder="e.g. sage, cream and terracotta" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Budget <span className="muted">(optional)</span>
            <select name="budget" defaultValue="">
              <option value="">Prefer not to say</option>
              {BUDGETS.map((budget) => <option key={budget}>{budget}</option>)}
            </select>
          </label>
          <label>
            Needed by <span className="muted">(optional)</span>
            <input name="deadline" type="date" min={todayISO()} />
          </label>
        </div>
        <label>
          Tell me more
          <textarea
            name="details"
            rows={5}
            maxLength={5000}
            required
            defaultValue={reference ? `I love "${reference}" and would like something similar.\n\n` : ''}
            placeholder="Who is it for? Where will it live? Any special meaning, patterns or textures you love?"
          />
        </label>
        <label>
          Inspiration photos <span className="muted">(optional, up to 3 images, 6 MB each)</span>
          <input name="references" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFiles} />
        </label>
        {fileNames.length > 0 && <p className="muted small">Attached: {fileNames.join(', ')}</p>}
        <Honeypot />
        <button type="submit" className="btn btn-large" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Send my request'}
        </button>
        <p className="muted small">Sending a request is free and doesn't commit you to anything.</p>
        <div aria-live="polite">
          {status.state === 'error' && <p className="error-text">{status.message}</p>}
        </div>
      </form>
    </section>
  );
}
