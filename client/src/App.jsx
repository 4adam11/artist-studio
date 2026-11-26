import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import { Loading } from './components/Status.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Collection from './pages/Collection.jsx';
import Contact from './pages/Contact.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import Order, { OrderLookup } from './pages/Order.jsx';
import Page from './pages/Page.jsx';
import Product from './pages/Product.jsx';
import Search from './pages/Search.jsx';
import Unsubscribe from './pages/Unsubscribe.jsx';
import { CartProvider } from './state/CartContext.jsx';
import { StoreProvider } from './state/StoreContext.jsx';

// The admin is loaded only when someone opens /admin, so shoppers never
// download it.
const Admin = lazy(() => import('./admin/Admin.jsx'));

export default function App() {
  return (
    <StoreProvider>
      <CartProvider>
        <Routes>
          <Route path="admin/*" element={<Suspense fallback={<div className="admin-loading"><Loading /></div>}><Admin /></Suspense>} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="collections/:handle" element={<Collection />} />
            <Route path="products/:handle" element={<Product />} />
            <Route path="search" element={<Search />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders/lookup" element={<OrderLookup />} />
            <Route path="orders/:token" element={<Order />} />
            <Route path="pages/:handle" element={<Page />} />
            <Route path="contact" element={<Contact />} />
            <Route path="unsubscribe/:token" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </CartProvider>
    </StoreProvider>
  );
}
