import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';

export default function Layout({ children, user }) {
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [mcName, setMcName] = useState(null);
  const [balance, setBalance] = useState(0);
  const [serverStatus, setServerStatus] = useState({ online: false, players: 0 });

  useEffect(() => {
    if (user) {
      const fetchMCName = async () => {
        try {
          const { data: tokenData } = await supabase.from('treasury_tokens').select('account_id').eq('user_id', user.id).maybeSingle();
          if (tokenData?.account_id) {
            const res = await fetch(`/api/app?action=mc-profile&uuid=${tokenData.account_id}`);
            if (res.ok) { const mcData = await res.json(); if (mcData.name) setMcName(mcData.name); }
          }
        } catch (e) { console.error(e); }
      };
      fetchMCName();

      // FIXED: Use maybeSingle so it doesn't crash if no balance row exists
      const fetchBalance = async () => {
        const { data, error } = await supabase.from('balances').select('balance').eq('user_id', user.id).maybeSingle();
        if (data) setBalance(data.balance || 0);
      };
      fetchBalance();
    }

    // NEW: Fetch live server status
    const fetchServerStatus = async () => {
      try {
        const res = await fetch('https://api.mcsrvstat.us/3/play.democracycraft.net');
        if (res.ok) {
          const data = await res.json();
          if (data?.online) {
            setServerStatus({ online: true, players: data.players?.online || 0 });
          } else {
            setServerStatus({ online: false, players: 0 });
          }
        }
      } catch (e) { console.error('Server status error:', e); }
    };
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const displayName = mcName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.avatar;
  const fullAvatarUrl = userAvatar ? (userAvatar.startsWith('http') ? userAvatar : `https://cdn.discordapp.com/avatars/${user.id}/${userAvatar}.png?size=128`) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#303134]">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/assets/logo.png" alt="Z&E Net" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain" style={{ imageRendering: 'pixelated', filter: 'contrast(1.2) brightness(1.1)' }} />
            <span className="text-xl sm:text-2xl font-bold hidden sm:inline">Z&E <span className="text-blue-600 dark:text-blue-400">NET</span></span>
          </a>
          
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${serverStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{serverStatus.online ? `${serverStatus.players} online` : 'Offline'}</span>
          </div>

          {user && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Wallet</span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-bold">${balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 px-2 py-1">{isDark ? '☀️' : '🌙'}</button>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-2">
                <a href="/account" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Account</a>
                <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Settings</a>
                <a href="/notifications" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Notifications</a>
                {user && <a href={`/profile/${user.id}`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">My Profile</a>}
                <a href="/submit-site" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Submit Site</a>
                <a href="/link-account" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Link MC Account</a>
                <a href="/admin" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Admin Dashboard</a>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <a href="/wiki" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Wiki</a>
                <a href="/contact" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Contact Us</a>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                {user && (
                  <button onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); window.location.href = '/'; }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-[#3c4043]">Sign Out</button>
                )}
              </div>
            )}
          </div>

          {user && <NotificationBell userId={user.id} />}
          {user && <a href="/settings" className="text-xs text-gray-500 hover:text-blue-600 px-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>}
          {user ? (
            <a href={`/profile/${user.id}`} className="flex items-center gap-2 hover:opacity-80">
              {fullAvatarUrl ? (
                <img src={fullAvatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">{displayName[0]?.toUpperCase()}</div>
              )}
              <span className="text-xs font-medium hidden md:inline text-gray-700 dark:text-gray-300">{displayName}</span>
            </a>
          ) : (
            <a href="/login" className="text-xs text-blue-600 hover:underline">Sign in</a>
          )}
        </div>
      </header>
      {children}
      <footer className="bg-gray-100 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-800 py-3 text-center text-xs text-gray-500 mt-auto">
        <p>Z&E Net is an independent search directory not affiliated with DemocracyCraft.</p>
        <p className="mt-1">© {new Date().getFullYear()} Z&E Net</p>
      </footer>
    </div>
  );
}
