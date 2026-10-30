import { Link } from 'react-router';
import { usePageTitle } from '../usePageTitle.js';

export default function About() {
  usePageTitle('About');

  return (
    <section className="page narrow">
      <h1>About the studio</h1>
      <p className="lead">
        This studio celebrates slow craftsmanship through fabric painting, crochet, and rich textures shaped by hand and heart.
      </p>
      <p>
        Every piece is made one at a time, so no two are exactly alike. Commissions are welcome, whether that's a
        wall hanging in your home's colors or a crochet heirloom for someone you love.
      </p>
      <Link to="/contact" className="btn">Ask about a commission</Link>
    </section>
  );
}
