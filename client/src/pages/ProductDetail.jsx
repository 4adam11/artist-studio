import { Link, useParams } from 'react-router';
import { AddToCartButton, StockNote } from '../components/Cards.jsx';
import { formatPrice } from '../format.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, config } = useStudio();
  const product = products.find((item) => String(item.id) === id);
  usePageTitle(product?.title || 'Product not found');

  if (!product) return <NotFound title="Product not found" backTo="/shop" backLabel="Back to shop" />;

  return (
    <section className="page detail-layout">
      <img src={product.image} alt={product.title} className="detail-image" />
      <div>
        <Link to="/shop" className="text-link">← Shop</Link>
        <p className="eyebrow">{product.category}</p>
        <h1>{product.title}</h1>
        <p>{product.description}</p>
        <p className="price">{formatPrice(product.price, config.currency)}</p>
        <StockNote stock={product.stock} />
        <AddToCartButton product={product} />
      </div>
    </section>
  );
}
