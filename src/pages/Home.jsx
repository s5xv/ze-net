import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const [trending, setTrending] = useState([]);
  const [newSites, setNewSites] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, totalUsers: 0 });

  useEffect(() => {
    fetchHomepageData();
  }, []);

  const fetchHomepageData = async () => {
    // Get trending sites (most views)
    const { data: trendingData } = await supabase
      .from('sites')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(5);
    setTrending(trendingData || []);

    // Get newest sites
    const { data: newData } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setNewSites(newData || []);

    // Get stats
    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
    setStats({ totalSites: siteCount || 0, totalUsers: 0 });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;

    // Log search analytics
    if (user) {
      await supabase.from('search_history').insert({ user_id: user.id, query: q.trim() });
    }
    await supabase.from('search_analytics').insert({ query: q.trim(), user_id: user?.id || null });

    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      {/* Mobile-friendly header */}
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        {user ? (
          <>
            <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN OUT</button>
          </>
        ) : (
          <a href="/login" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN IN</a>
        )}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-12">
        {/* Logo and Name - Responsive sizing */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-24 w-24 sm:h-32 sm:w-32 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center">
            Z&E <span className="text-orange-500">Net</span>
          </h1>
        </div>

        <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base mb-6 sm:mb-8 text-center">DemocracyCraft Centralized Directory</p>

        {/* Search bar - Mobile optimized */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8 sm:mb-12">
          <div className="relative group">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-base sm:text-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm dark:shadow-none"
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 px-4 sm:px-6 bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base font-medium rounded-lg transition-colors">
              Search
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-12 w-full max-w-2xl">
          <div className="bg-white dark:bg-[#111111] rounded-xl p-4 sm:p-6 border border-neutral-200 dark:border-white/5 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-orange-500 mb-1">{stats.totalSites}</p>
            <p className="text-xs sm:text-sm text-neutral-500">Total Sites</p>
          </div>
          <div className="bg-white dark:bg-[#111111] rounded-xl p-4 sm:p-6 border border-neutral-200 dark:border-white/5 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-orange-500 mb-1">∞</p>
            <p className="text-xs sm:text-sm text-neutral-500">Possibilities</p>
          </div>
        </div>

        {/* Trending & New - Mobile responsive grid */}
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Trending */}
          <div className="bg-white dark:bg-[#111111] rounded-xl p-4 sm:p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-sm sm:text-base font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Trending</h2>
            {trending.length === 0 ? (
              <p className="text-sm text-neutral-500">No sites yet</p>
            ) : (
              <ul className="space-y-3">
                {trending.map((item, i) => (
                  <li key={item.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/site/${item.slug}`)}>
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                      <span className="text-xs text-neutral-400 font-mono">{i + 1}.</span>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-orange-500 transition-colors truncate">{item.name}</span>
                    </div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-600 flex-shrink-0 ml-2">{item.view_count || 0} views</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* New */}
          <div className="bg-white dark:bg-[#111111] rounded-xl p-4 sm:p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-sm sm:text-base font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Newly Added</h2>
            {newSites.length === 0 ? (
              <p className="text-sm text-neutral-500">No sites yet</p>
            ) : (
              <ul className="space-y-3">
                {newSites.map((item, i) => (
                  <li key={item.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/site/${item.slug}`)}>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-orange-500 transition-colors truncate flex-grow">{item.name}</span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-600 flex-shrink-0 ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Donation Link */}
        <div className="mt-8 sm:mt-12 text-center">
          <a 
            href="https://gnomefundme.org/c/ze-net-build-the-duckduckgo-of-democracycraft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
          >
            Support Z&E Net Development
          </a>
        </div>
      </main>
    </div>
  );
}
