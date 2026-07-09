import { useState, useEffect } from 'react';

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewed');
    if (stored) {
      setRecentlyViewed(JSON.parse(stored));
    }
  }, []);

  const addToRecentlyViewed = (site) => {
    const updated = [site, ...recentlyViewed.filter((s) => s.id !== site.id)].slice(0, 10);
    setRecentlyViewed(updated);
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem('recentlyViewed');
  };

  return { recentlyViewed, addToRecentlyViewed, clearRecentlyViewed };
}
