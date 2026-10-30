export function formatPrice(amount, currency = 'usd') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  received: 'Received',
  shipped: 'Shipped',
  cancelled: 'Cancelled'
};
