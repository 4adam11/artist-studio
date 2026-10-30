import { useEffect, useState } from 'react';
import { ChevronIcon, ChevronLeftIcon, CloseIcon } from './Icons.jsx';

// Main photo with thumbnails underneath. Clicking the photo opens a full-screen
// view with arrow-key navigation, so buyers can look closely at stitches and texture.
export default function Gallery({ images, alt }) {
  const photos = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = Math.min(active, photos.length - 1);

  const step = (direction) => setActive((index) => (index + direction + photos.length) % photos.length);

  const count = photos.length;
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

  if (!photos.length) return null;

  return (
    <div className="gallery">
      <button type="button" className="gallery-main" onClick={() => setZoomed(true)} aria-label="View larger photo">
        <img src={photos[current]} alt={`${alt}${photos.length > 1 ? ` (photo ${current + 1} of ${photos.length})` : ''}`} />
      </button>

      {photos.length > 1 && (
        <div className="gallery-thumbs">
          {photos.map((photo, index) => (
            <button
              key={photo + index}
              type="button"
              className={index === current ? 'active' : ''}
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === current}
            >
              <img src={photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setZoomed(false)}>
          <button type="button" className="lightbox-close icon-button" onClick={() => setZoomed(false)} aria-label="Close" autoFocus>
            <CloseIcon size={26} />
          </button>
          <img src={photos[current]} alt={alt} onClick={(event) => event.stopPropagation()} />
          {photos.length > 1 && (
            <>
              <button type="button" className="lightbox-nav prev icon-button" onClick={(event) => { event.stopPropagation(); step(-1); }} aria-label="Previous photo">
                <ChevronLeftIcon size={30} />
              </button>
              <button type="button" className="lightbox-nav next icon-button" onClick={(event) => { event.stopPropagation(); step(1); }} aria-label="Next photo">
                <ChevronIcon size={30} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
