import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const StudioContext = createContext(null);

// Loads the public site content (artworks, products, shop settings) once and
// shares it with every page. `reload` refreshes it after admin edits or orders.
export function StudioProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    error: null,
    artworks: [],
    products: [],
    config: { currency: 'usd', onlinePayments: false }
  });

  const reload = useCallback(async () => {
    try {
      const [artworks, products, config] = await Promise.all([api.getArtworks(), api.getProducts(), api.getConfig()]);
      setState({ status: 'ready', error: null, artworks, products, config });
    } catch (error) {
      setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'ready' : 'error', error: error.message }));
    }
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    reload();
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ ...state, reload, retry }), [state, reload, retry]);
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  return useContext(StudioContext);
}
