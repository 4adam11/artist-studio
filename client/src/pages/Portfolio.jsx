import { useSearchParams } from 'react-router';
import { ArtworkCard } from '../components/Cards.jsx';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

export default function Portfolio() {
  usePageTitle('Portfolio');
  const { artworks } = useStudio();
  // The filter lives in the URL (e.g. /portfolio?category=Crochet) so filtered views can be shared.
  const [params, setParams] = useSearchParams();
  const filter = params.get('category') || 'All';

  const categories = ['All', ...new Set(artworks.map((item) => item.category))];
  const visible = filter === 'All' ? artworks : artworks.filter((item) => item.category === filter);

  const choose = (category) => setParams(category === 'All' ? {} : { category }, { replace: true });

  return (
    <section className="page">
      <div className="section-head">
        <h1>Portfolio</h1>
        <div className="filter-row" role="group" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${filter === category ? 'chip-active' : ''}`}
              aria-pressed={filter === category}
              onClick={() => choose(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="grid">
          {visible.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}
        </div>
      ) : (
        <p className="muted">No artworks in this category yet.</p>
      )}
    </section>
  );
}
