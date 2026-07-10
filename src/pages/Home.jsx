import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import AdminButton from '../components/AdminButton';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const [stats, setStats] = useState({ onlinePlayers: 0, totalSites: 0 });
  const [balance, setBalance] = useState(0);
  const [sessionTime, setSessionTime] = useState('0m');

  useEffect(() => {
    fetchStats();
    if (user) fetchBalance();
    
    // Simple session timer
    const start = Date.now();
    const timer = setInterval(() => {
      const mins = Math.floor((Date.now() - start) / 60000);
      setSessionTime(`${mins}m`);
    }, 60000);
    return () => clearInterval(timer);
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('https://map.democracycraft.net/maps/reveille/live/players.json');
      const data = await res.json();
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      setStats({ onlinePlayers: data.players?.length || 0, totalSites: count || 0 });
    } catch (err) { console.error(err); }
  };

  const fetchBalance = async () => {
    const { data } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(data?.balance || 0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleFeelingLucky = async () => {
    const { data } = await supabase.from('sites').select('*').limit(1000);
    if (data?.length) navigate(`/site/${data[Math.floor(Math.random() * data.length)].slug}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col">
      
      {/* TOP BAR - Matching Sketch */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">Wallet</span>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs">
              ${balance.toFixed(2)}
            </span>
          </div>
          <div className="hidden sm:block">Screen time: {sessionTime}</div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={toggleTheme} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
            {isDark ? '☀️ Light' : ' Dark'}
          </button>
          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 hidden sm:block">Websearch info</button>
          
          {/* Hamburger Menu */}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Avatar / Account */}
          {user ? (
            <a href="/account" className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.user_metadata?.name?.[0]?.toUpperCase() || 'U'
              )}
            </a>
          ) : (
            <a href="/login" className="text-sm text-blue-600 hover:underline">Sign in</a>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        
        {/* MASSIVE LOGO */}
        <div className="text-center mb-6">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight">
            Z&E <span className="text-blue-600 dark:text-blue-400">NET</span>
          </h1>
          <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>players online: {stats.onlinePlayers}</span>
            <span>•</span>
            <span>total sites: {stats.totalSites}</span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What's on your mind today?..."
            className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </form>

        {/* BUTTONS */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <button onClick={handleSearch} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            Search web
          </button>
          <button onClick={handleFeelingLucky} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            I'm feeling lucky
          </button>
          <button className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            More...
          </button>
        </div>

        {/* "ARE THEY SIMPLY THE BEST?!" SECTION - Matching Sketch */}
        <div className="w-full max-w-4xl mb-8">
          <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden h-64 sm:h-80 flex bg-white dark:bg-[#303134] shadow-lg">
            
            {/* Left Side: Character Image */}
            <div className="w-1/2 sm:w-2/5 bg-gray-100 dark:bg-[#202124] flex items-center justify-center p-4 border-r border-gray-300 dark:border-gray-700">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl mb-2">🧍</div>
                <p className="text-xs text-gray-500">Character</p>
              </div>
            </div>

            {/* Right Side: Text & Rainbow (Scrollable) */}
            <div className="w-1/2 sm:w-3/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  Are they simply the best?!
                </h2>
                <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-6">
                  Are rainbows simply better?
                </p>
              </div>
              
              {/* Rainbow Bar */}
              <div className="h-6 w-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 rounded-full mt-auto"></div>
            </div>

          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-800 py-4 text-center text-xs text-gray-500">
        <p>Z&E Net is an independent search directory not affiliated with DemocracyCraft.</p>
        <p className="mt-1">© {new Date().getFullYear()} Z&E Net</p>
      </footer>
    </div>
  );
}
