import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { supabase } from './services/supabase';
import AdminButton from '../components/AdminButton';
import Footer from '../components/Footer';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const [trending, setTrending] = useState([]);
  const [newSites, setNewSites] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0 });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [treasuryStats, setTreasuryStats] = useState({ onlinePlayers: [] });
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    fetchHomepageData();
    fetchTreasuryStats();
    fetchAnnouncement();

    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
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

  const fetchTreasuryStats = async () => {
    try {
      const res = await fetch('/api/treasury-stats');
      const data = await res.json();
      setTreasuryStats({ onlinePlayers: data.onlinePlayers || [] });
    } catch (err) {
      console.error('Failed to fetch treasury stats', err);
    }
  };

  const fetchAnnouncement = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
    setAnnouncement(data);
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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleFeelingLucky = async () => {
    const { data } = await supabase.from('sites').select('*').limit(1000);
    if (data && data.length > 0) {
      const randomSite = data[Math.floor(Math.random() * data.length)];
      navigate(`/site/${randomSite.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#202124] text-gray-900 dark:text-gray-100 transition-colors duration-200 flex flex-col">
      {/* Announcement Banner */}
      {announcement && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
          <strong>📢 {announcement.title}:</strong> {announcement.message}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        {user ? (
          <>
            <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide">ACCOUNT</a>
            <AdminButton />
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-xs sm:text-sm font-mono font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide">SIGN OUT</button>
          </>
        ) : (
          <a href="/login" className="text-xs sm:text-sm font-mono font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide">SIGN IN</a>
        )}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 py-12 sm:py-20">
        <div className="flex flex-col items-center gap-6 mb-8">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center">
            Z&E <span className="text-blue-600 dark:text-blue-400">Net</span>
          </h1>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-8 sm:mb-10 text-center">DemocracyCraft Centralized Directory</p>

        {/* Live Stats */}
        <div className="flex gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-[#303134] rounded-lg px-4 sm:px-6 py-3 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{treasuryStats.onlinePlayers.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Players Online</p>
          </div>
          <div className="bg-white dark:bg-[#303134] rounded-lg px-4 sm:px-6 py-3 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSites}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Sites</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6">
          <div className="relative group">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites or type a URL"
              className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-base sm:text-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-lg"
            />
            <button type="submit" className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium rounded-full transition-colors">
              Search
            </button>
          </div>
        </form>

        <div className="flex gap-3 mb-10">
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          >
            Google Search
          </button>
          <button
            onClick={handleFeelingLucky}
            className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          >
            I'm Feeling Lucky
          </button>
        </div>

        {/* Online Players */}
        {treasuryStats.onlinePlayers.length > 0 && (
          <div className="w-full max-w-4xl mb-8 bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-base font-bold text-green-600 dark:text-green-400 mb-3">🟢 Online Now ({treasuryStats.onlinePlayers.length})</h2>
            <div className="flex flex-wrap gap-2">
              {treasuryStats.onlinePlayers.slice(0, 20).map((player, i) => (
                <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full border border-green-200 dark:border-green-800">
                  {player.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-[#303134] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Trending</h2>
            {trending.length === 0 ? (
              <p className="text-sm text-gray-500">No sites yet</p>
            ) : (
              <ul className="space-y-3">
                {trending.map((item, i) => (
                  <li key={item.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/site/${item.slug}`)}>
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                      <span className="text-xs text-gray-400 font-mono">{i + 1}.</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{item.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0 ml-2">{item.view_count || 0} views</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-[#303134] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Newly Added</h2>
            {newSites.length === 0 ? (
              <p className="text-sm text-gray-500">No sites yet</p>
            ) : (
              <ul className="space-y-3">
                {newSites.map((item, i) => (
                  <li key={item.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/site/${item.slug}`)}>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate flex-grow">{item.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0 ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all z-50"
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
