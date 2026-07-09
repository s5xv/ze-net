import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Search({ user }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [q, setQ] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      fetchResults();
    }
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from('sites')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('is_sponsored', { ascending: false })
      .order('is_verified', { ascending: false })
      .order('view_count', { ascending: false });

    setResults(data || []);

    await supabase.from('search_analytics').insert({
      query: query,
      user_id: user?.id || null,
      results_count: data?.length || 0
    });

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="bg-white dark:bg-[#111111] border-b border-neutral-200 dark:border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <a href="/" className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <img 
              src="/assets/logo.png" 
              alt="Z&E Net" 
              className="h-14 w-14 sm:h-16 sm:w-16 object-contain" 
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-2xl sm:text-3xl font-bold tracking-tight hidden sm:block">Z&E <span className="text-orange-500">Net</span></span>
          </a>
          
          <form onSubmit={handleSearch} className="flex-grow w-full sm:w-auto">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </form>

          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            {user ? (
              <a href="/account" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
            ) : (
              <a href="/login" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN IN</a>
            )}
            <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Search Results</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {loading ? 'Searching...' : `${results.length} results for "${query}"`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl animate-pulse">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-3"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500">No results found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item) => (
              <div 
                key={item.id} 
                className="p-4 sm:p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl hover:border-orange-500/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/site/${item.slug}`)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{item.name}</h3>
                  {item.is_verified && <span className="text-xs text-orange-500">✓</span>}
                  {item.is_sponsored && <span className="px-2 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded uppercase tracking-wider">Sponsored</span>}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{item.description}</p>
                <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 font-mono flex-wrap">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>{item.owner_name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{item.view_count || 0} views</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
