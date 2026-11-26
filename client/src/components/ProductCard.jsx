import { Link } from 'react-router';
import { productOnSale } from '../state/catalog.js';
import { ProductPrice } from './Price.jsx';

export default function ProductCard({ product }) {
  const [image, hoverImage] = product.images;
  const label = !product.available ? 'Sold out' : productOnSale(product) ? 'Sale' : null;

  return (
    <article className={`product-card ${product.available ? '' : 'is-sold-out'}`}>
      <Link to={`/products/${product.handle}`} className="product-card-link">
        <div className="product-card-media">
          {image ? <img src={image} alt="" loading="lazy" /> : <span className="image-empty" />}
          {/* Second photo on hover, as most stores do. */}
          {hoverImage && <img src={hoverImage} alt="" loading="lazy" className="product-card-hover" />}
          {label && <span className="product-card-label">{label}</span>}
        </div>
        <h3 className="product-card-title">{product.title}</h3>
        <ProductPrice product={product} />
      </Link>
    </article>
  );
}

export function ProductGrid({ products }) {
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
