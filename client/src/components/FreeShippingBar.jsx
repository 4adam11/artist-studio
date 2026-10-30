import { formatPrice } from '../format.js';
import { useStudio } from '../state/StudioContext.jsx';

// "You're $12 away from free shipping" with a progress bar.
export default function FreeShippingBar({ subtotal }) {
  const { settings, config } = useStudio();
  const threshold = settings.freeShippingOver;
  if (!threshold || subtotal <= 0) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);

  return (
    <div className="free-shipping">
      <p>
        {remaining > 0
          ? <>You're <strong>{formatPrice(remaining, config.currency)}</strong> away from free shipping</>
          : <>🎉 Your order ships <strong>free</strong></>}
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progress to free shipping">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
