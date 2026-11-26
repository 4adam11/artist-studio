import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../api.js';

const SESSION_KEY = 'store-admin-session';
const AdminContext = createContext(null);

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return session?.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

// Holds the admin session (a signed token, never the password; kept for this
// browser tab only) and an API client that logs out when the session expires.
export function AdminProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
    setSession(null);
  }, []);

  const login = useCallback(async (password) => {
    const result = await request('/admin/login', { method: 'POST', body: { password } });
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(result)); } catch { /* storage unavailable */ }
    setSession(result);
  }, []);

  // Log out automatically when the token expires while the tab is open.
  useEffect(() => {
    if (!session) return undefined;
    const timer = setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, logout]);

  const api = useMemo(() => {
    const call = async (method, path, body, options = {}) => {
      try {
        return await request(`/admin${path}`, { method, body, token: session?.token, ...options });
      } catch (error) {
        if (error.status === 401) logout();
        throw error;
      }
    };
    return {
      get: (path) => call('GET', path),
      post: (path, body) => call('POST', path, body),
      put: (path, body) => call('PUT', path, body),
      patch: (path, body) => call('PATCH', path, body),
      remove: (path) => call('DELETE', path),
      download: (path) => call('GET', path, undefined, { raw: true }),
      upload: (file) => {
        const form = new FormData();
        form.append('image', file);
        return call('POST', '/uploads', form);
      }
    };
  }, [session, logout]);

  // Sidebar counters (orders to fulfil, unread messages). Pages call
  // refreshCounts after an action so the badges update straight away.
  const [counts, setCounts] = useState({});
  const refreshCounts = useCallback(() => {
    if (session) api.get('/stats').then(setCounts).catch(() => {});
  }, [api, session]);

  const value = useMemo(() => ({ session, login, logout, api, counts, refreshCounts }), [session, login, logout, api, counts, refreshCounts]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}

// Loads one admin resource: { data, error, loading, reload, setData }.
export function useAdminData(path) {
  const { api } = useAdmin();
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      setState({ data: await api.get(path), error: null, loading: false });
    } catch (error) {
      setState({ data: null, error: error.message, loading: false });
    }
  }, [api, path]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((data) => setState((prev) => ({ ...prev, data })), []);
  return { ...state, reload, setData };
}
