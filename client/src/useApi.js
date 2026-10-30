import { useCallback, useEffect, useState } from 'react';

// Loads data for a single page (journal posts, events, reviews…) and exposes
// { data, error, loading, reload }. `load` must be stable (wrap it in useCallback
// or pass a function defined outside the component).
export function useApi(load) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null, loading: true }));
    try {
      setState({ data: await load(), error: null, loading: false });
    } catch (error) {
      setState({ data: null, error: error.message, loading: false });
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
