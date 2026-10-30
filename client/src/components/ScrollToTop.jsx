import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Single-page apps keep the scroll position between pages; start each page at the top.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
