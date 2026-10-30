import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import { ErrorNotice, Honeypot, Loading } from '../components/Status.jsx';
import { formatDate } from '../format.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

export default function ArtworkDetail() {
  const { id } = useParams();
  const { artworks } = useStudio();
  const artwork = artworks.find((item) => String(item.id) === id);
  usePageTitle(artwork?.title || 'Artwork not found');

  if (!artwork) {
    return <NotFound title="Artwork not found" backTo="/portfolio" backLabel="Back to portfolio" />;
  }

  return (
    <section className="page detail-layout">
      <img src={artwork.image} alt={artwork.title} className="detail-image" />
      <div>
        <Link to="/portfolio" className="text-link">← Portfolio</Link>
        <p className="eyebrow">{artwork.category}</p>
        <h1>{artwork.title}</h1>
        <p>{artwork.description}</p>
        <p>{artwork.story || 'This piece carries layers of texture, memory, and studio process.'}</p>
        <Comments key={artwork.id} artworkId={artwork.id} />
      </div>
    </section>
  );
}

// Comments are fetched only for the artwork being viewed, not for every
// artwork when the site first loads.
function Comments({ artworkId }) {
  const [comments, setComments] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState({ state: 'idle' });

  useEffect(() => {
    let active = true;
    api.getComments(artworkId)
      .then((list) => active && setComments(list))
      .catch((error) => active && setLoadError(error.message));
    return () => { active = false; };
  }, [artworkId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus({ state: 'sending' });
    try {
      const comment = await api.addComment(artworkId, data);
      setComments((prev) => [...(prev || []), comment]);
      form.reset();
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Discuss this piece</h2>
      <form onSubmit={handleSubmit} className="form-card">
        <label>
          Your name
          <input name="name" maxLength={60} required />
        </label>
        <label>
          Your comment or question
          <textarea name="message" maxLength={1000} rows={3} required />
        </label>
        <Honeypot />
        <button type="submit" className="btn" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Posting…' : 'Post comment'}
        </button>
        <div aria-live="polite">
          {status.state === 'error' && <p className="error-text">{status.message}</p>}
          {status.state === 'sent' && <p className="success-text">Thanks for joining the conversation.</p>}
        </div>
      </form>

      <div className="comments">
        {loadError && <ErrorNotice message={loadError} />}
        {!loadError && !comments && <Loading label="Loading comments…" />}
        {comments?.length === 0 && <p className="muted">No comments yet. Be the first to start the discussion.</p>}
        {comments?.map((comment) => (
          <div key={comment.id} className="comment-card">
            <strong>{comment.name}</strong>
            {comment.createdAt && <span className="muted small"> · {formatDate(comment.createdAt)}</span>}
            <p>{comment.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
