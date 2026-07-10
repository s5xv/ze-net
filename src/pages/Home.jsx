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
  const [trending, setTrending] = useState([]);
  const [newSites, setNewSites] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, onlinePlayers: 0 });
  const [announcement, setAnnouncement] = useState(null);
  const [urlType, setUrlType] = useState('website'); // website, player, plot, discord

  useEffect(() => {
    fetchHomepageData();
    fetchAnnouncement();
    loadBookmarks();
  }, [user]);

  const fetchHomepageData = async () => {
    // Get trending sites
    const { data: trendingData } = await supabase.from('sites').select('*').order('view_count', { ascending: false }).limit(5);
    setTrending(trendingData || []);

    // Get newly added sites
    const { data: newData } = await supabase.from('sites').select('*').order('created_at', { ascending: false }).limit(5);
    setNewSites(newData || []);

    // Get total sites count
    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
    
    // Get online players from BlueMap
    try {
      const res = await fetch('https://map.democracycraft.net/maps/reveille/live/players.json');
      const data = await res.json();
      setStats({ 
        totalSites: siteCount || 0, 
        onlinePlayers: data.players?.length || 0 
      });
    } catch (err) {
      setStats({ totalSites: siteCount || 0, onlinePlayers: 0 });
    }
  };

  const fetchAnnouncement = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
    setAnnouncement(data);
  };

  const loadBookmarks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookmarks')
      .select('site_id, sites(name, slug, category, url, urls)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookmarks(data || []);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;

    // Check if it's a URL type
    if (urlType === 'player') {
      // Search for player on wiki
      navigate(`/wiki?search=${encodeURIComponent(q.trim())}`);
    } else if (urlType === 'plot') {
      // Open BlueMap with plot coordinates
      window.open(`https://map.democracycraft.net/?x=0&y=64&z=0&zoom=5`, '_blank');
    } else if (urlType === 'discord') {
      // Open Discord
      window.open(q.trim().startsWith('http') ? q.trim() : `https://discord.gg/${q.trim()}`, '_blank');
    } else {
      // Regular search
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
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
          <strong> {announcement.title}:</strong> {announcement.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-[#303134] border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/assets/logo.png" alt="Z&E Net" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
            <h1 className="text-2xl sm:text-3xl font-bold">Z&E <span className="text-blue-600 dark:text-blue-400">NET</span></h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <a href="/account" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Account</a>
                <AdminButton />
                <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Sign Out</button>
              </>
            ) : (
              <a href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Sign In</a>
            )}
            <button onClick={toggleTheme} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Stats Bar */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            🟢 {stats.onlinePlayers} players online
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            📊 {stats.totalSites} total sites
          </div>
        </div>

        {/* Main Search Section */}
        <div className="bg-white dark:bg-[#303134] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-lg mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">What's on your mind today?...</h2>
          
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2 mb-3">
              <select
                value={urlType}
                onChange={(e) => setUrlType(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-[#3c4043] border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="website">Website</option>
                <option value="player">Player (Wiki)</option>
                <option value="plot">Plot Location</option>
                <option value="discord">Discord</option>
              </select>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  urlType === 'player' ? 'Search player names (e.g., Escudos)...' :
                  urlType === 'plot' ? 'Enter plot coords (e.g., C576)...' :
                  urlType === 'discord' ? 'Enter Discord invite code...' :
                  'Search sites or type a URL'
                }
                className="flex-grow px-4 py-2 bg-gray-100 dark:bg-[#3c4043] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Search
              </button>
            </div>
          </form>

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={handleSearch} className="px-6 py-2.5 bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 dark:hover:bg-[#4a4d51] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
              Google Search
            </button>
            <button onClick={handleFeelingLucky} className="px-6 py-2.5 bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 dark:hover:bg-[#4a4d51] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
              I'm Feeling Lucky
            </button>
          </div>
        </div>

        {/* Bookmarks Section */}
        {user && bookmarks.length > 0 && (
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">⭐</span> Your Bookmarks
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.site_id}
                  onClick={() => bookmark.sites?.slug && navigate(`/site/${bookmark.sites.slug}`)}
                  className="p-3 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer"
                >
                  <h4 className="font-semibold text-sm mb-1">{bookmark.sites?.name || 'Unknown'}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{bookmark.sites?.category || 'Site'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fun Section - Are they simply the best?! */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl"></div>
            <div>
              <h3 className="text-xl font-bold">Are they simply the best?!</h3>
              <p className="text-gray-600 dark:text-gray-400">Are rainbows simply better?</p>
            </div>
          </div>
          <div className="h-32 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 rounded-lg opacity-80"></div>
        </div>

        {/* Trending & New Sites */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-500 dark:text-gray-400 uppercase tracking-wider">🔥 Trending</h3>
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

          <div className="bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-500 dark:text-gray-400 uppercase tracking-wider">✨ Newly Added</h3>
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

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <a href="/wiki" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">📚 Wiki</a>
          <a href="/forums" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">💬 Forums</a>
          <a href="/departments" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">🏛️ Departments</a>
          <a href="/utilities" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">🛠️ Utilities</a>
          <a href="/challenge" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">🎯 Challenge</a>
          <a href="/achievements" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm">🏆 Achievements</a>
          <a href="/leaderboard" className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors shadow-sm"> Leaderboard</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
