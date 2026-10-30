import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import About from './pages/About.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import ArtworkDetail from './pages/ArtworkDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Contact from './pages/Contact.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import Portfolio from './pages/Portfolio.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Shop from './pages/Shop.jsx';
import { CartProvider } from './state/CartContext.jsx';
import { StudioProvider } from './state/StudioContext.jsx';

export default function App() {
  return (
    <StudioProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="portfolio/:id" element={<ArtworkDetail />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:token" element={<OrderConfirmation />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </CartProvider>
    </StudioProvider>
  );
}
