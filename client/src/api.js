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

async function request(path, { method = 'GET', body, token, raw = false } = {}) {
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
    throw new ApiError("We couldn't reach the studio server. Please check your connection and try again.", 0);
  }

  if (response.ok && raw) return response.blob();
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Something went wrong (error ${response.status})`, response.status);
  return data;
}

const post = (path, body) => request(path, { method: 'POST', body });

export const api = {
  getConfig: () => request('/config'),
  getArtworks: () => request('/artworks'),
  getProducts: () => request('/products'),
  getComments: (artworkId) => request(`/artworks/${artworkId}/comments`),
  addComment: (artworkId, comment) => post(`/artworks/${artworkId}/comments`, comment),
  getReviews: (productId) => request(`/products/${productId}/reviews`),
  addReview: (productId, review) => post(`/products/${productId}/reviews`, review),
  notifyWhenAvailable: (productId, email) => post(`/products/${productId}/notify`, { email }),
  getPosts: () => request('/posts'),
  getPost: (id) => request(`/posts/${id}`),
  getEvents: () => request('/events'),
  sendContact: (message) => post('/contact', message),
  sendCommission: (form) => post('/commissions', form),
  subscribe: (email, source) => post('/subscribe', { email, source }),
  unsubscribe: (token) => post('/unsubscribe', { token }),
  quote: (items, discountCode) => post('/checkout/quote', { items, discountCode }),
  checkout: (order) => post('/checkout', order),
  getOrder: (token) => request(`/orders/${encodeURIComponent(token)}`)
};

export const adminLogin = (password) => post('/admin/login', { password });

export function adminApi(token) {
  const call = (method, path, body) => request(`/admin${path}`, { method, body, token });
  return {
    checkSession: () => call('GET', '/session'),
    stats: () => call('GET', '/stats'),
    list: (collection) => call('GET', `/${collection}`),
    create: (collection, item) => call('POST', `/${collection}`, item),
    update: (collection, id, item) => call('PUT', `/${collection}/${id}`, item),
    patch: (collection, id, changes) => call('PATCH', `/${collection}/${id}`, changes),
    remove: (collection, id) => call('DELETE', `/${collection}/${id}`),
    getSettings: () => call('GET', '/settings'),
    saveSettings: (settings) => call('PUT', '/settings', settings),
    downloadSubscribers: () => request('/admin/subscribers.csv', { token, raw: true }),
    uploadImage: (file) => {
      const form = new FormData();
      form.append('image', file);
      return call('POST', '/uploads', form);
    }
  };
}
