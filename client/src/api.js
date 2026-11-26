// Every call to the backend goes through here. In development Vite proxies
// /api to the Express server; set VITE_API_URL only if the API lives on a
// different domain in production.
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = {};
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body)
    });
  } catch {
    throw new ApiError('Could not connect to the store. Check your connection and try again.', 0);
  }

  if (response.ok && raw) return response.blob();
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Something went wrong (error ${response.status})`, response.status);
  return data;
}

const post = (path, body) => request(path, { method: 'POST', body });

export const api = {
  storefront: () => request('/storefront'),
  page: (handle) => request(`/pages/${encodeURIComponent(handle)}`),
  contact: (message) => post('/contact', message),
  subscribe: (email, source) => post('/subscribe', { email, source }),
  unsubscribe: (token) => post('/unsubscribe', { token }),
  quote: (body) => post('/checkout/quote', body),
  checkout: (order) => post('/checkout', order),
  order: (token) => request(`/orders/${encodeURIComponent(token)}`),
  lookupOrder: (number, email) => post('/orders/lookup', { number, email })
};
