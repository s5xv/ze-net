import { useState, useEffect } from 'react';
import { listings } from '../services/supabase';

export function useSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query?.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const { data, error } = await listings.search(query);
      
      if (error) {
        setError(error);
      } else {
        setResults(data || []);
      }
      
      setLoading(false);
    };

    fetchResults();
  }, [query]);

  return { results, loading, error };
}
