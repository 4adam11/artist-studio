export default function QuantityStepper({ product, quantity, onChange }) {
  return (
    <div className="stepper" role="group" aria-label={`Quantity of ${product.title}`}>
      <button type="button" onClick={() => onChange(product, quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{quantity}</span>
      <button type="button" onClick={() => onChange(product, quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity">+</button>
    </div>
  );
}
