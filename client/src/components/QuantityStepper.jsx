export default function QuantityStepper({ label, quantity, max = Infinity, onChange, small = false }) {
  return (
    <div className={`stepper ${small ? 'stepper-small' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)} disabled={quantity >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}
