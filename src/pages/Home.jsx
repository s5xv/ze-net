import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { isDark, toggleTheme } = useTheme();

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      
      {/* Top bar */}
      <div className="flex justify-end gap-4 px-6 py-4">
        {user ? (
          <>
            <a href="/account" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
            <button onClick={handleSignOut} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN OUT</button>
          </>
        ) : (
          <a href="/login" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN IN</a>
        )}
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-start px-4 py-12">
        
        {/* Logo and Name - MASSIVE and PERFECTLY ALIGNED */}
        <div className="flex items-center gap-6 mb-6">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-40 w-40 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-7xl font-bold tracking-tight text-center">
            Z&E <span className="text-orange-500">Net</span>
          </h1>
        </div>

        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-10 text-center">DemocracyCraft Centralized Directory</p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-12">
          <div className="relative group">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search... (Try !g for Gov, !c for Corp, !s for Service)"
              className="w-full px-5 py-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm dark:shadow-none"
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">Search</button>
          </div>
        </form>

        {/* Category Buttons */}
        <div className="flex gap-3 mb-12">
          <button onClick={() => navigate('/category/Government')} className="px-5 py-2 text-sm font-medium bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 text-blue-600 dark:text-blue-400 rounded-lg hover:border-blue-500/50 transition-all">Government</button>
          <button onClick={() => navigate('/category/Corporate')} className="px-5 py-2 text-sm font-medium bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 text-purple-600 dark:text-purple-400 rounded-lg hover:border-purple-500/50 transition-all">Corporate</button>
          <button onClick={() => navigate('/category/Service')} className="px-5 py-2 text-sm font-medium bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 text-green-600 dark:text-green-400 rounded-lg hover:border-green-500/50 transition-all">Service</button>
        </div>
      </main>
    </div>
  );
}
