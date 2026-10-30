export function Stars({ value, size = 'normal' }) {
  const rounded = Math.round(value);
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rounded ? 'star-on' : 'star-off'} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export function RatingSummary({ rating, link }) {
  if (!rating?.count) return null;
  const content = (
    <>
      <Stars value={rating.average} size="small" />
      <span className="muted small">{rating.average.toFixed(1)} ({rating.count})</span>
    </>
  );
  return link ? <a href={link} className="rating-summary">{content}</a> : <span className="rating-summary">{content}</span>;
}

// Accessible star picker for the review form (radio buttons under the hood).
export function StarInput({ value, onChange }) {
  return (
    <fieldset className="star-input">
      <legend>Your rating</legend>
      {[1, 2, 3, 4, 5].map((star) => (
        <label key={star} className={star <= value ? 'star-on' : 'star-off'}>
          <input type="radio" name="rating" value={star} checked={value === star} onChange={() => onChange(star)} required />
          <span aria-hidden="true">★</span>
          <span className="visually-hidden">{star} star{star > 1 ? 's' : ''}</span>
        </label>
      ))}
    </fieldset>
  );
}
