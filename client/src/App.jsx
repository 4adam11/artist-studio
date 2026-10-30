import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import About from './pages/About.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import ArtworkDetail from './pages/ArtworkDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Commissions from './pages/Commissions.jsx';
import Contact from './pages/Contact.jsx';
import Events from './pages/Events.jsx';
import Favorites from './pages/Favorites.jsx';
import { Faq, ShippingReturns } from './pages/HelpPages.jsx';
import Home from './pages/Home.jsx';
import { JournalList, JournalPost } from './pages/Journal.jsx';
import NotFound from './pages/NotFound.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import Portfolio from './pages/Portfolio.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Search from './pages/Search.jsx';
import Shop from './pages/Shop.jsx';
import Unsubscribe from './pages/Unsubscribe.jsx';
import { CartProvider } from './state/CartContext.jsx';
import { FavoritesProvider } from './state/FavoritesContext.jsx';
import { StudioProvider } from './state/StudioContext.jsx';

export default function App() {
  return (
    <StudioProvider>
      <CartProvider>
        <FavoritesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="shop/:id" element={<ProductDetail />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="portfolio/:id" element={<ArtworkDetail />} />
              <Route path="commissions" element={<Commissions />} />
              <Route path="journal" element={<JournalList />} />
              <Route path="journal/:id" element={<JournalPost />} />
              <Route path="events" element={<Events />} />
              <Route path="search" element={<Search />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order/:token" element={<OrderConfirmation />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="faq" element={<Faq />} />
              <Route path="shipping-returns" element={<ShippingReturns />} />
              <Route path="unsubscribe/:token" element={<Unsubscribe />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </FavoritesProvider>
      </CartProvider>
    </StudioProvider>
  );
}
