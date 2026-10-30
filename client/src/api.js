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

async function request(path, { method = 'GET', body, token } = {}) {
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

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Something went wrong (error ${response.status})`, response.status);
  return data;
}

export const api = {
  getConfig: () => request('/config'),
  getArtworks: () => request('/artworks'),
  getProducts: () => request('/products'),
  getComments: (artworkId) => request(`/artworks/${artworkId}/comments`),
  addComment: (artworkId, comment) => request(`/artworks/${artworkId}/comments`, { method: 'POST', body: comment }),
  sendContact: (message) => request('/contact', { method: 'POST', body: message }),
  checkout: (order) => request('/checkout', { method: 'POST', body: order }),
  getOrder: (token) => request(`/orders/${encodeURIComponent(token)}`)
};

export function adminApi(token) {
  const call = (method, path, body) => request(`/admin${path}`, { method, body, token });
  return {
    checkSession: () => call('GET', '/session'),
    list: (collection) => call('GET', `/${collection}`),
    create: (collection, item) => call('POST', `/${collection}`, item),
    update: (collection, id, item) => call('PUT', `/${collection}/${id}`, item),
    remove: (collection, id) => call('DELETE', `/${collection}/${id}`),
    setMessageRead: (id, read) => call('PATCH', `/messages/${id}`, { read }),
    setOrderStatus: (id, status) => call('PATCH', `/orders/${id}`, { status }),
    uploadImage: (file) => {
      const form = new FormData();
      form.append('image', file);
      return call('POST', '/uploads', form);
    }
  };
}
