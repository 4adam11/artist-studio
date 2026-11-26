import { Link } from 'react-router';
import { useCart } from '../state/CartContext.jsx';
import { useStore } from '../state/StoreContext.jsx';
import QuantityStepper from './QuantityStepper.jsx';

export default function CartLine({ line, compact = false }) {
  const { update, remove } = useCart();
  const { money } = useStore();
  const { product, variant, quantity } = line;
  const variantName = variant.options.join(' / ');

  return (
    <div className={`cart-line ${compact ? 'cart-line-compact' : ''}`}>
      <Link to={`/products/${product.handle}`} className="cart-line-image" tabIndex={-1} aria-hidden="true">
        {product.images[0] ? <img src={product.images[0]} alt="" /> : <span className="image-empty" />}
      </Link>
      <div className="cart-line-info">
        <Link to={`/products/${product.handle}`} className="cart-line-title">{product.title}</Link>
        {variantName && <span className="muted small">{variantName}</span>}
        <span className="small">{money(variant.price)}</span>
        <div className="cart-line-actions">
          <QuantityStepper
            small
            label={`Quantity of ${product.title}${variantName ? `, ${variantName}` : ''}`}
            quantity={quantity}
            max={variant.stock}
            onChange={(value) => update(variant, value)}
          />
          <button type="button" className="link-button small" onClick={() => remove(variant.id)}>Remove</button>
        </div>
      </div>
      <span className="cart-line-total">{money(variant.price * quantity)}</span>
    </div>
  );
}
