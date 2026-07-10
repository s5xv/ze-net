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
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

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
    <div className="min-h-screen bg-white dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header - Top Right */}
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
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {isDark ? (
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      {/* Main Content - Centered like Google */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-16">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mt-3">
            Z&E <span className="text-blue-600 dark:text-blue-400">Net</span>
          </h1>
        </div>

        {/* Search Bar - Google Style */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6 sm:mb-8">
          <div className="relative group">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites or type a URL"
              className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-transparent focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 rounded-full text-base sm:text-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all shadow-sm hover:shadow-md dark:hover:shadow-lg"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </form>

        {/* Buttons - Google Style */}
        <div className="flex flex-wrap gap-3 justify-center mb-8 sm:mb-12">
          <button
            onClick={handleSearch}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-50 dark:bg-[#303134] hover:bg-gray-100 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors shadow-sm"
          >
            Google Search
          </button>
          <button
            onClick={handleFeelingLucky}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-50 dark:bg-[#303134] hover:bg-gray-100 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors shadow-sm"
          >
            I'm Feeling Lucky
          </button>
        </div>

        {/* Bookmarks - Only for logged in users */}
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

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center text-sm">
          <a href="/wiki" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Wiki</a>
          <a href="/forums" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Forums</a>
          <a href="/departments" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Departments</a>
          <a href="/utilities" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Utilities</a>
          <a href="/challenge" className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#303134] rounded-lg transition-colors">Challenge</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
