import { useState } from 'react';
import { Link, useParams } from 'react-router';
import Gallery from '../components/Gallery.jsx';
import { Price } from '../components/Price.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import RichText from '../components/RichText.jsx';
import { findVariant, initialSelection, isValueAvailable, relatedProducts } from '../state/catalog.js';
import { useCart } from '../state/CartContext.jsx';
import { useStore } from '../state/StoreContext.jsx';
import { usePageTitle } from '../usePageTitle.js';
import NotFound from './NotFound.jsx';

export default function Product() {
  const { handle } = useParams();
  const { productByHandle, products, collections } = useStore();
  const product = productByHandle(handle);
  usePageTitle(product?.title || 'Not found');

  if (!product) return <NotFound />;

  return (
    <>
      <section className="container section product">
        <Gallery images={product.images} alt={product.title} />
        <ProductInfo key={product.id} product={product} />
      </section>
      <RelatedProducts product={product} products={products} collections={collections} />
    </>
  );
}

function ProductInfo({ product }) {
  const { add, quantityOf } = useCart();
  const [selected, setSelected] = useState(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const variant = findVariant(product, selected);
  const inCart = variant ? quantityOf(variant.id) : 0;
  const left = variant ? variant.stock - inCart : 0;

  function choose(optionIndex, value) {
    const next = [...selected];
    next[optionIndex] = value;
    setSelected(next);
    setQuantity(1);
  }

  let button = 'Add to cart';
  if (!variant || !variant.available) button = 'Sold out';
  else if (left < 1) button = 'All available stock is in your cart';

  return (
    <div className="product-info">
      {product.productType && <p className="muted small">{product.productType}</p>}
      <h1>{product.title}</h1>
      {variant && <Price price={variant.price} compareAtPrice={variant.compareAtPrice} />}

      {product.options.map((option, optionIndex) => (
        <fieldset key={option.name} className="option-picker">
          <legend>{option.name}<span className="muted">: {selected[optionIndex]}</span></legend>
          <div className="option-values">
            {option.values.map((value) => {
              const available = isValueAvailable(product, selected, optionIndex, value);
              return (
                <label key={value} className={`option-value ${available ? '' : 'is-unavailable'}`}>
                  <input
                    type="radio"
                    name={`option-${optionIndex}`}
                    value={value}
                    checked={selected[optionIndex] === value}
                    onChange={() => choose(optionIndex, value)}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {variant?.available && variant.stock <= 3 && <p className="small stock-note">{variant.stock === 1 ? 'Only 1 left' : `Only ${variant.stock} left`}</p>}

      <div className="buy">
        {variant?.available && left > 0 && (
          <QuantityStepper label="Quantity" quantity={quantity} max={left} onChange={setQuantity} />
        )}
        <button
          type="button"
          className="btn btn-block"
          disabled={!variant?.available || left < 1}
          onClick={() => { add(variant, quantity); setQuantity(1); }}
        >
          {button}
        </button>
      </div>

      {product.description && <RichText text={product.description} className="rich-text product-description" />}
      <p className="small"><Link to="/pages/shipping-returns" className="text-link">Shipping &amp; returns</Link></p>
    </div>
  );
}

function RelatedProducts({ product, products, collections }) {
  const related = relatedProducts(product, products, collections);
  if (!related.length) return null;
  return (
    <section className="container section">
      <div className="section-head"><h2>You may also like</h2></div>
      <ProductGrid products={related} />
    </section>
  );
}
