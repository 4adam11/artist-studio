const PENDING_KEY = 'artist-studio-pending-order';

// The cart is only emptied once the order the buyer just placed is confirmed,
// so cancelling on the Stripe page brings them back to a full cart.
export function rememberPendingOrder(token) {
  try { localStorage.setItem(PENDING_KEY, token); } catch { /* storage unavailable */ }
}

export function takePendingOrder(token) {
  try {
    if (localStorage.getItem(PENDING_KEY) !== token) return false;
    localStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
