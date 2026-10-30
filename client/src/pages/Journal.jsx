import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { formatDate } from '../format.js';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

export function JournalList() {
  usePageTitle('Journal');
  const { data: posts, error, loading, reload } = useApi(api.getPosts);

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Journal</h1>
        <p className="muted">Stories behind the pieces, works in progress and life in the studio.</p>
      </div>
      {error && <ErrorNotice message={error} onRetry={reload} />}
      {loading && <Loading />}
      {posts?.length === 0 && <p className="muted">The first story is being written. Check back soon!</p>}
      <div className="grid">
        {posts?.map((post) => (
          <article key={post.id} className="card story-card">
            <Link to={`/journal/${post.id}`} className="card-image-link" tabIndex={-1} aria-hidden="true">
              <img src={post.image} alt="" loading="lazy" />
            </Link>
            <div className="card-body">
              <p className="tag">{formatDate(post.createdAt)}</p>
              <h3><Link to={`/journal/${post.id}`} className="card-title">{post.title}</Link></h3>
              <p>{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function JournalPost() {
  const { id } = useParams();
  const load = useCallback(() => api.getPost(id), [id]);
  const { data: post, error, loading, reload } = useApi(load);
  usePageTitle(post?.title || 'Journal');

  if (loading) return <section className="page"><Loading /></section>;
  if (error?.includes('not found')) return <NotFound title="Story not found" backTo="/journal" backLabel="Back to the journal" />;
  if (error) return <section className="page"><ErrorNotice message={error} onRetry={reload} /></section>;

  return (
    <article className="page narrow post">
      <Breadcrumbs items={[['Home', '/'], ['Journal', '/journal'], [post.title]]} />
      <p className="eyebrow">{formatDate(post.createdAt)}</p>
      <h1>{post.title}</h1>
      <p className="lead">{post.excerpt}</p>
      <img src={post.image} alt="" className="post-image" />
      {/* Plain paragraphs: the text is shown as written, never as HTML. */}
      {post.body.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="pre-wrap">{paragraph}</p>)}
      <div className="panel">
        <h2 className="panel-title">Enjoyed this story?</h2>
        <p className="muted">Get new stories and pieces in your inbox a few times a year.</p>
        <NewsletterForm source="journal" compact />
      </div>
      <Link to="/journal" className="text-link">← All stories</Link>
    </article>
  );
}
