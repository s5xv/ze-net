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
  const [stats, setStats] = useState({ totalSites: 0 });
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    fetchHomepageData();

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    const handleKeyPress = (e) => {
      if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          alert('🎉 You found the secret! Redirecting to mining game...');
          navigate('/mining-game');
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const fetchHomepageData = async () => {
    const { data: trendingData } = await supabase.from('sites').select('*').order('view_count', { ascending: false }).limit(5);
    setTrending(trendingData || []);

    const { data: newData } = await supabase.from('sites').select('*').order('created_at', { ascending: false }).limit(5);
    setNewSites(newData || []);

    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
    setStats({ totalSites: siteCount || 0 });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;

    if (user) {
      await supabase.from('search_history').insert({ user_id: user.id, query: q.trim() });
    }
    await supabase.from('search_analytics').insert({ query: q.trim(), user_id: user?.id || null });

    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
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

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col items-center gap-6 mb-8">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-48 w-48 sm:h-64 sm:w-64 md:h-80 md:w-80 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-center">
            Z&E <span className="text-orange-500">Net</span>
          </h1>
        </div>

        <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg mb-8 sm:mb-10 text-center">DemocracyCraft Centralized Directory</p>

        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-10 sm:mb-12">
          <div className="relative group">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites..."
              className="w-full px-5 sm:px-6 py-4 sm:py-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg sm:text-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm dark:shadow-none"
            />
            <button type="submit" className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 px-5 sm:px-8 bg-orange-500 hover:bg-orange-600 text-white text-base sm:text-lg font-medium rounded-lg transition-colors">
              Search
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-12 w-full max-w-2xl">
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-white/5 text-center">
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-500 mb-2">{stats.totalSites}</p>
            <p className="text-sm sm:text-base text-neutral-500">Total Sites</p>
          </div>
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-white/5 text-center">
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-500 mb-2">∞</p>
            <p className="text-sm sm:text-base text-neutral-500">Possibilities</p>
          </div>
        </div>

        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-[#111111] rounded-xl p-5 sm:p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Trending</h2>
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

          <div className="bg-white dark:bg-[#111111] rounded-xl p-5 sm:p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Newly Added</h2>
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

        <div className="mt-8 sm:mt-12 text-center">
          <a 
            href="https://gnomefundme.org/c/ze-net-build-the-duckduckgo-of-democracycraft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors text-base sm:text-lg"
          >
            Support Z&E Net Development
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center space-y-2">
          <div className="flex gap-4 justify-center text-sm flex-wrap">
            <a href="/forums" className="text-neutral-500 hover:text-orange-500 transition-colors">Forums</a>
            <span className="text-neutral-300">•</span>
            <a href="/departments" className="text-neutral-500 hover:text-orange-500 transition-colors">Departments</a>
            <span className="text-neutral-300">•</span>
            <a href="/changelog" className="text-neutral-500 hover:text-orange-500  transition-colors">Changelog</a>
            <span className="text-neutral-300">•</span>
            <a href="/contact" className="text-neutral-500 hover:text-orange-500 transition-colors">Contact</a>
          </div>
        </div>
      </main>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg transition-all z-50"
          aria-label="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
