import { useCallback } from 'react';
import { useParams } from 'react-router';
import { api } from '../api.js';
import RichText from '../components/RichText.jsx';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

// Content pages written in the admin (About, FAQ, Shipping & returns…).
export default function Page() {
  const { handle } = useParams();
  const load = useCallback(() => api.page(handle), [handle]);
  const { data: page, error, loading, reload } = useApi(load);
  usePageTitle(page?.title);

  if (loading) return <section className="container section narrow"><Loading /></section>;
  if (error?.includes('not found')) return <NotFound />;
  if (error) return <section className="container section narrow"><ErrorNotice message={error} onRetry={reload} /></section>;

  return (
    <article className="container section narrow">
      <header className="page-header"><h1>{page.title}</h1></header>
      <RichText text={page.body} />
    </article>
  );
}
