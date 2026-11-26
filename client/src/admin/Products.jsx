import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { matchesQuery } from '../state/catalog.js';
import { useStore } from '../state/StoreContext.jsx';
import { useAdminData } from './AdminContext.jsx';
import { DataState, PageHead, ProductStatusBadge } from './ui.jsx';

const FILTERS = [['all', 'All'], ['active', 'Active'], ['draft', 'Draft'], ['archived', 'Archived']];

export default function ProductList() {
  const { data: products, ...state } = useAdminData('/products');
  const { money } = useStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const visible = (products || []).filter((product) =>
    (filter === 'all' || product.status === filter) &&
    matchesQuery(query, [product.title, product.productType, product.vendor, product.tags, product.variants.map((v) => v.sku)]));

  return (
    <div className="admin-page">
      <PageHead title="Products">
        <Link to="/admin/products/new" className="btn btn-small">Add product</Link>
      </PageHead>
      <DataState {...state}>
        <section className="card card-flush">
          <div className="table-toolbar">
            <div className="tabs" role="group" aria-label="Filter products">
              {FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
            </div>
            <input type="search" placeholder="Search by title, type, tag or SKU" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search products" />
          </div>
          {visible.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Product</th><th>Status</th><th>Inventory</th><th>Type</th><th className="num">Price</th></tr>
                </thead>
                <tbody>
                  {visible.map((product) => {
                    const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
                    const prices = product.variants.map((variant) => variant.price);
                    const [min, max] = [Math.min(...prices), Math.max(...prices)];
                    return (
                      <tr key={product.id} className="is-link" onClick={() => navigate(`/admin/products/${product.id}`)}>
                        <td>
                          <span className="cell-product">
                            {product.images[0] ? <img src={product.images[0]} alt="" className="table-thumb" /> : <span className="table-thumb" />}
                            <Link to={`/admin/products/${product.id}`}>{product.title}</Link>
                          </span>
                        </td>
                        <td><ProductStatusBadge status={product.status} /></td>
                        <td className={stock === 0 ? 'field-error' : 'muted'}>
                          {stock} in stock{product.variants.length > 1 && ` for ${product.variants.length} variants`}
                        </td>
                        <td className="muted">{product.productType}</td>
                        <td className="num">{min === max ? money(min) : `${money(min)} – ${money(max)}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ padding: '1.25rem' }}>
              {products?.length ? 'No products match.' : <>No products yet. <Link to="/admin/products/new" className="text-link">Add your first product</Link>.</>}
            </p>
          )}
        </section>
      </DataState>
    </div>
  );
}
