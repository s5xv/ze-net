import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function NotFound() {
  const navigate = useNavigate();
  const [popular, setPopular] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase.from('sites').select('name, slug').eq('status', 'approved').order('view_count', { ascending: false }).limit(6).then(({ data }) => setPopular(data || []));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-7xl mb-4">🧭</div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">404</h1>
        <p className="text-neutral-500 mb-6">Looks like this page wandered off the map.</p>
        <form onSubmit={submit} className="mb-6">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the directory instead..."
            className="w-full px-4 py-3 bg-white dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </form>
        <div className="flex gap-2 justify-center mb-6">
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Go Home</button>
          <button onClick={() => navigate('/leaderboard')} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg text-sm">Top Sites</button>
        </div>
        {popular.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Popular sites</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {popular.map(s => (
                <button key={s.slug} onClick={() => navigate(`/site/${s.slug}`)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-sm text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
