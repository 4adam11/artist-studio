import { Link } from 'react-router';
import { usePageTitle } from '../usePageTitle.js';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <section className="container section narrow">
      <h1>Page not found</h1>
      <p className="muted">This page doesn't exist or is no longer available.</p>
      <Link to="/collections/all" className="btn btn-outline">Continue shopping</Link>
    </section>
  );
}
