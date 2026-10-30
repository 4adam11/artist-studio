import { Link } from 'react-router';
import { usePageTitle } from '../usePageTitle.js';

export default function About() {
  usePageTitle('About');

  return (
    <section className="page narrow prose">
      <p className="eyebrow">About the studio</p>
      <h1>Slow craft, made by hand and heart</h1>
      <p className="lead">
        This studio celebrates slow craftsmanship through fabric painting, crochet, and rich textures shaped by hand.
      </p>
      <p>
        Every piece is made one at a time, so no two are exactly alike. Paintings are built up in thin layers on
        natural cotton and linen; crochet is worked stitch by stitch in soft, natural yarns chosen to last for years.
      </p>
      <h2>What guides the work</h2>
      <ul>
        <li><strong>Natural materials</strong>: cotton, linen, wool and plant fibres wherever possible.</li>
        <li><strong>Made to last</strong>: pieces meant to be used, loved and passed on.</li>
        <li><strong>Thoughtful packaging</strong>: recycled and plastic-free whenever possible.</li>
      </ul>
      <div className="actions actions-left">
        <Link to="/shop" className="btn">Shop the collection</Link>
        <Link to="/commissions" className="btn btn-ghost">Ask about a commission</Link>
      </div>
    </section>
  );
}
