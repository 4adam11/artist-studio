import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseIdList, readStorage, writeStorage } from './storage.js';

const STORAGE_KEY = 'artist-studio-favorites';
const FavoritesContext = createContext(null);

// Saved products, kept in the browser so visitors don't need an account.
export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(() => readStorage(STORAGE_KEY, parseIdList));

  useEffect(() => {
    writeStorage(STORAGE_KEY, ids);
  }, [ids]);

  const toggle = useCallback((id) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const value = useMemo(() => ({ ids, count: ids.length, has: (id) => ids.includes(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
