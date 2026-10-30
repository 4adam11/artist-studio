import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addToCart, cartCount, parseStoredCart, removeFromCart, setQuantity } from './cart.js';
import { readStorage, writeStorage } from './storage.js';

const STORAGE_KEY = 'artist-studio-cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEY, parseStoredCart));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    writeStorage(STORAGE_KEY, cart);
  }, [cart]);

  // Keep the cart in sync when the site is open in several tabs.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setCart(parseStoredCart(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Adding an item opens the cart drawer so the buyer sees it went in.
  const add = useCallback((product) => {
    setCart((prev) => addToCart(prev, product.id, product.stock));
    setDrawerOpen(true);
  }, []);
  const update = useCallback((product, quantity) => setCart((prev) => setQuantity(prev, product.id, quantity, product.stock)), []);
  const remove = useCallback((id) => setCart((prev) => removeFromCart(prev, id)), []);
  const clear = useCallback(() => setCart([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(
    () => ({ cart, count: cartCount(cart), add, update, remove, clear, replace: setCart, drawerOpen, openDrawer, closeDrawer }),
    [cart, add, update, remove, clear, drawerOpen, openDrawer, closeDrawer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
