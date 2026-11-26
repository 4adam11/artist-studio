import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './Icons.jsx';

// Main photo with thumbnails. Clicking the photo opens a full-screen view
// with arrow-key navigation.
export default function Gallery({ images, alt }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;
  const current = Math.min(active, Math.max(0, count - 1));

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % count);
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [zoomed, count]);

  if (!count) return <div className="gallery"><div className="gallery-main"><span className="image-empty" /></div></div>;

  const step = (direction) => setActive((index) => (index + direction + count) % count);

  return (
    <div className="gallery">
      <button type="button" className="gallery-main" onClick={() => setZoomed(true)} aria-label="Zoom photo">
        <img src={images[current]} alt={count > 1 ? `${alt}, photo ${current + 1} of ${count}` : alt} />
      </button>

      {count > 1 && (
        <div className="gallery-thumbs">
          {images.map((image, index) => (
            <button
              key={image + index}
              type="button"
              className={index === current ? 'is-active' : ''}
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === current}
            >
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setZoomed(false)}>
          <img src={images[current]} alt={alt} onClick={(event) => event.stopPropagation()} />
          <button type="button" className="icon-button lightbox-close" onClick={() => setZoomed(false)} aria-label="Close" autoFocus>
            <CloseIcon size={24} />
          </button>
          {count > 1 && (
            <>
              <button type="button" className="icon-button lightbox-prev" onClick={(event) => { event.stopPropagation(); step(-1); }} aria-label="Previous photo">
                <ChevronLeftIcon size={28} />
              </button>
              <button type="button" className="icon-button lightbox-next" onClick={(event) => { event.stopPropagation(); step(1); }} aria-label="Next photo">
                <ChevronRightIcon size={28} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
