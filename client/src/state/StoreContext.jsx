import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatMoney } from '../format.js';

const StoreContext = createContext(null);

// Loads the storefront (settings, products, collections, pages) once and
// shares it with every page. `reload` refreshes it after admin edits or orders.
export function StoreProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', error: null, data: null });

  const reload = useCallback(async () => {
    try {
      const data = await api.storefront();
      setState({ status: 'ready', error: null, data });
    } catch (error) {
      setState((prev) => ({ ...prev, status: prev.data ? 'ready' : 'error', error: error.message }));
    }
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    reload();
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => {
    const data = state.data || { settings: { currency: 'usd', shippingRates: [] }, products: [], collections: [], pages: [] };
    return {
      ...data,
      status: state.status,
      error: state.error,
      reload,
      retry,
      money: (amount) => formatMoney(amount, data.settings.currency),
      productByHandle: (handle) => data.products.find((product) => product.handle === handle),
      collectionByHandle: (handle) => data.collections.find((collection) => collection.handle === handle)
    };
  }, [state, reload, retry]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
