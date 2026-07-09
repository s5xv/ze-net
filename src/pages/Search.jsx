import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Search({ user }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [q, setQ] = useState(query);
  const { isDark, toggleTheme } = useTheme();

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border-b border-neutral-200 dark:border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center">
          
          {/* Left: Logo and Name */}
          <div className="w-1/4 flex items-center gap-4">
            <a href="/" className="flex items-center gap-4 flex-shrink-0">
              <img 
                src="/assets/logo.png" 
                alt="Z&E Net" 
                className="h-12 w-12 object-contain" 
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-2xl font-bold tracking-tight hidden sm:block">Z&E <span className="text-orange-500">Net</span></span>
            </a>
          </div>
          
          {/* Center: Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search... (!g Gov, !c Corp, !s Service)"
              className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </form>

          {/* Right: Auth & Theme */}
          <div className="w-1/4 flex justify-end gap-4">
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

        </div>
      </header>

      {/* Results */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Search Results</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Showing results for "{query}"</p>
        </div>
        <div className="space-y-3">
          <div className="p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl hover:border-orange-500/30 transition-colors cursor-pointer">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Example Business</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">This is a placeholder result.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
