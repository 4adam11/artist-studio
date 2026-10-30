import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Artist Studio` : 'Artist Studio';
  }, [title]);
}
