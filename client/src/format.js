export function formatMoney(amount, currency = 'usd') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function formatDate(iso, withTime = false) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', ...(withTime && { hour: 'numeric', minute: '2-digit' }) };
  return new Date(iso).toLocaleString(undefined, options);
}

export const pluralize = (count, word, plural = `${word}s`) => `${count} ${count === 1 ? word : plural}`;
