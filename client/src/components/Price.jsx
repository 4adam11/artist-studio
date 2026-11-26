import { useStore } from '../state/StoreContext.jsx';

// Shows "From $140" for products whose variants differ in price, and the
// original price struck through when a variant is on sale.
export function Price({ price, compareAtPrice, from = false }) {
  const { money } = useStore();
  const sale = compareAtPrice && compareAtPrice > price;
  return (
    <span className="price">
      {from && <span className="muted">From </span>}
      <span className={sale ? 'price-sale' : undefined}>{money(price)}</span>
      {sale && <s className="price-compare">{money(compareAtPrice)}</s>}
    </span>
  );
}

export function ProductPrice({ product }) {
  const cheapest = product.variants.reduce((best, variant) => (variant.price < best.price ? variant : best), product.variants[0]);
  return <Price price={product.priceMin} compareAtPrice={cheapest.compareAtPrice} from={product.priceMin !== product.priceMax} />;
}
