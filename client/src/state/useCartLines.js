import { useEffect, useMemo, useState } from 'react';
import { cartTotal, resolveCart } from './cart.js';
import { useCart } from './CartContext.jsx';
import { useStudio } from './StudioContext.jsx';

export function useCartLines() {
  const { cart, replace } = useCart();
  const { products } = useStudio();
  const { lines, changed } = useMemo(() => resolveCart(cart, products), [cart, products]);
  const [adjusted, setAdjusted] = useState(false);

  // If stock changed since the item was added, fix the saved cart and tell the buyer.
  useEffect(() => {
    if (!changed) return;
    replace(lines.map((line) => ({ id: line.product.id, quantity: line.quantity })));
    setAdjusted(true);
  }, [changed, lines, replace]);

  return { lines, total: cartTotal(lines), adjusted };
}
