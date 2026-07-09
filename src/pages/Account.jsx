import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { useBookmarks } from '../hooks/useBookmarks';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

export default function Account({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [balance, setBalance] = useState(0);
  const [mcLinked, setMcLinked] = useState(false);
  const [mcUuid, setMcUuid] = useState('');
  const [checkingDeposits, setCheckingDeposits] = useState(false);
  const [lastChecked, setLastChecked] = useState('Never');
  const { bookmarks } = useBookmarks(user);
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
    
    const interval = setInterval(() => verifyDeposits(true), 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchData = async () => {
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(balData?.balance || 0);

    const { data: mcData } = await supabase.from('treasury_tokens').select('account_id').eq('user_id', user.id).single();
    if (mcData) { setMcLinked(true); setMcUuid(mcData.account_id); }
  };

  const verifyDeposits = async (silent = false) => {
    if (!silent) setCheckingDeposits(true);
    try {
      await fetch('/api/check-deposits');
      fetchData();
      const now = new Date();
      setLastChecked(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    } catch (err) {
      console.error('Failed to verify deposits', err);
    } finally {
      if (!silent) setCheckingDeposits(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex justify-end gap-4 px-6 py-4">
        <a href="/" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">Account Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Profile & Linking</h2>
            <div className="space-y-3 text-sm">
              <p><span className="text-neutral-500">Discord:</span> {user.user_metadata.name || user.email}</p>
              <p><span className="text-neutral-500">MC Status:</span> {mcLinked ? <span className="text-green-500">LINKED</span> : <span className="text-red-500">NOT LINKED</span>}</p>
              {mcLinked && <p className="font-mono text-xs break-all">UUID: {mcUuid}</p>}
              {!mcLinked && <a href="/link-account" className="text-orange-500 hover:underline">Link MC Account</a>}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Site Balance</h2>
            <p className="text-4xl font-bold text-orange-500 mb-4">${balance.toFixed(2)}</p>
            <p className="text-xs text-neutral-500">Deposit in-game to increase your balance.</p>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">How to Deposit</h2>
            <div className="bg-black rounded-lg p-4 font-mono text-green-400 text-lg mb-4 border border-neutral-800 text-center">
              /paya business ZEN [amount]
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold mb-1">Deposit Verification</h3>
                <p className="text-xs text-neutral-500">Last check: {lastChecked}</p>
              </div>
              <button 
                onClick={() => verifyDeposits(false)} 
                disabled={checkingDeposits}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white rounded-lg text-sm font-mono"
              >
                {checkingDeposits ? 'Checking...' : 'Verify Deposits'}
              </button>
            </div>
          </div>

          {/* Bookmarks */}
          {bookmarks.length > 0 && (
            <div className="md:col-span-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Your Bookmarks</h2>
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div 
                    key={bookmark.site_id}
                    onClick={() => navigate(`/site/${bookmark.sites.slug}`)}
                    className="p-3 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg cursor-pointer hover:border-orange-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{bookmark.sites.name}</span>
                      <span className="text-xs text-neutral-500 font-mono">{bookmark.sites.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <div className="md:col-span-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recently Viewed</h2>
                <button 
                  onClick={clearRecentlyViewed}
                  className="text-xs text-neutral-500 hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentlyViewed.map((site) => (
                  <div 
                    key={site.id}
                    onClick={() => navigate(`/site/${site.slug}`)}
                    className="p-3 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg cursor-pointer hover:border-orange-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{site.name}</span>
                      <span className="text-xs text-neutral-500 font-mono">{site.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
