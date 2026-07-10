import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';

export default function Layout({ children, user }) {
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [mcName, setMcName] = useState(null);

  useEffect(() => {
    if (user) {
      // Get MC name from treasury_tokens or user profile
      const fetchMCName = async () => {
        const { data } = await supabase
          .from('treasury_tokens')
          .select('account_id')
          .eq('user_id', user.id)
          .single();
        
        if (data?.account_id) {
          // Fetch MC username from account_id (UUID to name)
          try {
            const res = await fetch(`https://api.mojang.com/user/profile/${data.account_id}`);
            const mcData = await res.json();
            setMcName(mcData.name);
          } catch (e) {
            setMcName(null);
          }
        }
      };
      fetchMCName();
    }
  }, [user]);

  const displayName = mcName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.avatar;
  const fullAvatarUrl = userAvatar 
    ? (userAvatar.startsWith('http') ? userAvatar : `https://cdn.discordapp.com/avatars/${user.id}/${userAvatar}.png?size=128`)
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Unified Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#303134]">
        <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">Wallet</span>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs">
              $0.00
            </span>
          </div>
          <div className="hidden sm:block">Screen time: 0m</div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={toggleTheme} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 hidden sm:block">Websearch info</button>
          
          {/* Hamburger Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <a href="/admin" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Admin Dashboard</a>
                <a href="/account" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Account Settings</a>
                <a href="/wiki" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Wiki</a>
                <a href="/forums" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Forums</a>
                {user && (
                  <button 
                    onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-[#3c4043]"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>

          {user ? (
            <a href="/account" className="flex items-center gap-2 hover:opacity-80">
              {fullAvatarUrl ? (
                <img src={fullAvatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline text-gray-700 dark:text-gray-300">{displayName}</span>
            </a>
          ) : (
            <a href="/login" className="text-sm text-blue-600 hover:underline">Sign in</a>
          )}
        </div>
      </header>

      {children}

      {/* Unified Footer */}
      <footer className="bg-gray-100 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-800 py-4 text-center text-xs text-gray-500 mt-auto">
        <p>Z&E Net is an independent search directory not affiliated with DemocracyCraft.</p>
        <p className="mt-1">© {new Date().getFullYear()} Z&E Net</p>
      </footer>
    </div>
  );
}
