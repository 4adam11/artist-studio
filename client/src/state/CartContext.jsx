import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addItem, cartCount, cartSubtotal, parseStoredCart, removeItem, resolveCart, setQuantity } from './cart.js';
import { readStorage, writeStorage } from './storage.js';
import { useStore } from './StoreContext.jsx';

const STORAGE_KEY = 'store-cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { products, status } = useStore();
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEY, parseStoredCart));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjusted, setAdjusted] = useState(false);

  useEffect(() => {
    writeStorage(STORAGE_KEY, cart);
  }, [cart]);

  // Keep the cart in sync when the store is open in several tabs.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setCart(parseStoredCart(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const { lines, changed } = useMemo(() => resolveCart(cart, products), [cart, products]);

  // If stock changed since an item was added, fix the saved cart and say so.
  useEffect(() => {
    if (status !== 'ready' || !changed) return;
    setCart(lines.map((line) => ({ variantId: line.variant.id, quantity: line.quantity })));
    setAdjusted(true);
  }, [status, changed, lines]);

  // Adding opens the cart drawer so the shopper sees it worked.
  const add = useCallback((variant, quantity = 1) => {
    setCart((prev) => addItem(prev, variant.id, quantity, variant.stock));
    setDrawerOpen(true);
  }, []);
  const update = useCallback((variant, quantity) => setCart((prev) => setQuantity(prev, variant.id, quantity, variant.stock)), []);
  const remove = useCallback((variantId) => setCart((prev) => removeItem(prev, variantId)), []);
  const clear = useCallback(() => setCart([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(() => ({
    lines,
    count: cartCount(cart),
    subtotal: cartSubtotal(lines),
    quantityOf: (variantId) => cart.find((item) => item.variantId === variantId)?.quantity || 0,
    adjusted,
    add, update, remove, clear, drawerOpen, openDrawer, closeDrawer
  }), [cart, lines, adjusted, add, update, remove, clear, drawerOpen, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
