import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addToCart, cartCount, parseStoredCart, removeFromCart, setQuantity } from './cart.js';

const STORAGE_KEY = 'artist-studio-cart';
const CartContext = createContext(null);

function readStoredCart() {
  try {
    return parseStoredCart(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Private browsing or storage disabled: the cart still works for this visit.
    }
  }, [cart]);

  // Keep the cart in sync when the site is open in several tabs.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setCart(parseStoredCart(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((product) => setCart((prev) => addToCart(prev, product.id, product.stock)), []);
  const update = useCallback((product, quantity) => setCart((prev) => setQuantity(prev, product.id, quantity, product.stock)), []);
  const remove = useCallback((id) => setCart((prev) => removeFromCart(prev, id)), []);
  const clear = useCallback(() => setCart([]), []);

  const value = useMemo(
    () => ({ cart, count: cartCount(cart), add, update, remove, clear, replace: setCart }),
    [cart, add, update, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
