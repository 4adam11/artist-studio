import { Link } from 'react-router';
import { usePageTitle } from '../usePageTitle.js';

export default function NotFound({ title = 'Page not found', backTo = '/', backLabel = 'Back to home' }) {
  usePageTitle(title);
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>The page you are looking for does not exist or may have been removed.</p>
      <Link to={backTo} className="text-link">{backLabel}</Link>
    </section>
  );
}
