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

// Event dates are plain YYYY-MM-DD values; read them as local dates so they
// don't shift by a day in time zones behind UTC.
const localDate = (ymd) => {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function formatDateRange(start, end) {
  const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
  const from = localDate(start).toLocaleDateString(undefined, options);
  if (!end || end === start) return from;
  return `${from} – ${localDate(end).toLocaleDateString(undefined, options)}`;
}

export const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  received: 'Received',
  shipped: 'Shipped',
  cancelled: 'Cancelled'
};

export const COMMISSION_STATUS_LABELS = {
  new: 'New',
  quoted: 'Quote sent',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  declined: 'Declined'
};
