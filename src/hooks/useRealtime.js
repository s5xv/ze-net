import { useEffect, useRef } from 'react';

export function usePolling(fetchFn, interval = 5000, enabled = true) {
  const savedFn = useRef(fetchFn);
  savedFn.current = fetchFn;

  useEffect(() => {
    if (!enabled) return;
    savedFn.current();
    const id = setInterval(() => savedFn.current(), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
