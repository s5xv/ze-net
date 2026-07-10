import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import AdminButton from '../components/AdminButton';
import Footer from '../components/Footer';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const [stats, setStats] = useState({ onlinePlayers: 0, totalSites: 0 });
  const [topSearched, setTopSearched] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchTopSearched();
    if (user) loadBookmarks();
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('https://map.democracycraft.net/maps/reveille/live/players.json');
      const data = await res.json();
      
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      
      setStats({
        onlinePlayers: data.players?.length || 0,
        totalSites: count || 0
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchTopSearched = async () => {
    // Get most searched item this week
    const { data } = await supabase
      .from('search_analytics')
      .select('query')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);
    
    if (data && data.length > 0) {
      const counts = {};
      data.forEach(item => {
        counts[item.query] = (counts[item.query] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        setTopSearched({ query: top[0], count: top[1] });
      }
    }
  };

  const loadBookmarks = async () => {
    const { data } = await supabase
      .from('bookmarks')
      .select('site_id, sites(name, slug, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookmarks(data || []);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleFeelingLucky = async () => {
    const { data } = await supabase.from('sites').select('*').limit(1000);
    if (data && data.length > 0) {
      const randomSite = data[Math.floor(Math.random() * data.length)];
      navigate(`/site/${randomSite.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Top Bar - Like Google */}
      <div className="flex justify-end items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3">
        {user ? (
          <>
            <a href="/account" className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Account</a>
            <AdminButton />
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Sign out</button>
          </>
        ) : (
          <a href="/login" className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Sign in</a>
        )}
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          {isDark ? (
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      <main className="flex-grow flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        {/* MASSIVE Logo */}
        <div className="mb-6 sm:mb-8 text-center">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-56 lg:w-56 object-contain mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mt-4">
            Z&E <span className="text-blue-600 dark:text-blue-400">NET</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
             {stats.onlinePlayers} players online
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            📊 {stats.totalSites} total sites
          </div>
        </div>

        {/* Search Box - "What's on your mind today?..." */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6">
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What's on your mind today?..."
              className="w-full px-5 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-transparent focus:ring-2 focus:ring-blue-500/20 rounded-full text-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all shadow-sm"
            />
          </div>
        </form>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          >
            Search web
          </button>
          <button
            onClick={handleFeelingLucky}
            className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          >
            I'm feeling lucky
          </button>
          <button className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
            More...
          </button>
        </div>

        {/* Bookmarks */}
        {user && bookmarks.length > 0 && (
          <div className="w-full max-w-2xl mb-8">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Your Bookmarks</h3>
            <div className="flex flex-wrap gap-2">
              {bookmarks.map((bookmark) => (
                <button
                  key={bookmark.site_id}
                  onClick={() => bookmark.sites?.slug && navigate(`/site/${bookmark.sites.slug}`)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {bookmark.sites?.name || 'Unknown'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* "Are they simply the best?!" Section */}
        {topSearched && (
          <div className="w-full max-w-3xl mb-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-lg">
            <div className="text-center mb-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                Are they simply the best?!
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Most searched this week
              </p>
            </div>
            <div className="bg-white dark:bg-[#303134] rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl">🏆</span>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                    "{topSearched.query}"
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Searched {topSearched.count} times this week
                  </p>
                </div>
              </div>
              {/* Rainbow */}
              <div className="h-16 sm:h-20 bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 rounded-lg opacity-90 mt-4"></div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center text-sm">
          <a href="/wiki" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Wiki</a>
          <a href="/forums" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Forums</a>
          <a href="/departments" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Departments</a>
          <a href="/utilities" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Utilities</a>
          <a href="/challenge" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Challenge</a>
          <a href="/achievements" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Achievements</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
