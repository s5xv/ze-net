import { useState, useEffect } from 'react';

export default function Clock({ showSeconds = false }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', ...(showSeconds ? { second: '2-digit' } : {}) });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  return (
    <span className="flex flex-col items-end leading-tight" title={`${dateStr} — ${tz}`}>
      <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{timeStr}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{dateStr}</span>
    </span>
  );
}
