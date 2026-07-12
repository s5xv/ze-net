import { useState, useEffect } from 'react';

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) setRecentlyViewed(JSON.parse(stored));
    } catch { localStorage.removeItem('recentlyViewed'); }
  }, []);

  const addToRecentlyViewed = (site) => {
    setRecentlyViewed(prev => {
      const updated = [site, ...prev.filter((s) => s.id !== site.id)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem('recentlyViewed');
  };

  return { recentlyViewed, addToRecentlyViewed, clearRecentlyViewed };
}
