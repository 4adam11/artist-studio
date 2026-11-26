import { useEffect } from 'react';
import { useStore } from './state/StoreContext.jsx';

export function usePageTitle(title) {
  const { settings } = useStore();
  const storeName = settings.storeName || 'Store';
  useEffect(() => {
    document.title = title ? `${title} · ${storeName}` : storeName;
  }, [title, storeName]);
}
