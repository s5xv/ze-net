import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Account() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [balance, setBalance] = useState(0);
  const [mcLinked, setMcLinked] = useState(false);
  const [mcUuid, setMcUuid] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    // Only redirect if auth is done loading and user is null
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(balData?.balance || 0);

    const { data: mcData } = await supabase.from('treasury_tokens').select('account_id').eq('user_id', user.id).single();
    if (mcData) { setMcLinked(true); setMcUuid(mcData.account_id); }

    const { data: bookmarkData } = await supabase
      .from('bookmarks')
      .select('site_id, sites(name, slug, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookmarks(bookmarkData || []);

    const stored = localStorage.getItem('recentlyViewed');
    setRecentlyViewed(stored ? JSON.parse(stored) : []);
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem('recentlyViewed');
    setRecentlyViewed([]);
  };

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <Layout user={null}>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const userDisplayName = user?.user_metadata?.global_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.avatar;
  const fullAvatarUrl = userAvatar 
    ? (userAvatar.startsWith('http') ? userAvatar : `https://cdn.discordapp.com/avatars/${user.id}/${userAvatar}.png?size=256`)
    : null;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-gradient-to-br from-[#5865F2]/20 to-[#5865F2]/5 dark:from-[#5865F2]/10 dark:to-transparent rounded-2xl p-6 sm:p-8 border border-[#5865F2]/20 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {fullAvatarUrl ? (
              <img src={fullAvatarUrl} alt={userDisplayName} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#5865F2]/30 shadow-xl" />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#5865F2] to-[#7983F5] flex items-center justify-center text-white text-4xl sm:text-5xl font-bold border-4 border-[#5865F2]/30 shadow-xl">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-grow text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">{userDisplayName}</h1>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="px-3 py-1 bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold rounded-full border border-[#5865F2]/30">DISCORD MEMBER</span>
                {mcLinked && <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full border border-green-500/30">MC LINKED</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Account Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Discord ID:</span>
                <span className="font-mono text-xs">{user.id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">MC Status:</span>
                {mcLinked ? (
                  <span className="text-green-500 font-medium">✓ LINKED</span>
                ) : (
                  <a href="/link-account" className="text-blue-600 hover:underline">Link MC Account →</a>
                )}
              </div>
              {mcLinked && (
                <div className="flex justify-between">
                  <span className="text-gray-500">MC UUID:</span>
                  <span className="font-mono text-xs break-all">{mcUuid}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Site Balance</h2>
            <p className="text-4xl font-bold text-green-600 mb-4">${balance.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Deposit in-game to increase your balance.</p>
          </div>

          {bookmarks.length > 0 && (
            <div className="md:col-span-2 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Your Bookmarks ({bookmarks.length})</h2>
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.site_id} onClick={() => navigate(`/site/${bookmark.sites.slug}`)} className="p-3 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{bookmark.sites.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{bookmark.sites.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentlyViewed.length > 0 && (
            <div className="md:col-span-2 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recently Viewed ({recentlyViewed.length})</h2>
                <button onClick={clearRecentlyViewed} className="text-xs text-gray-500 hover:text-red-500">Clear All</button>
              </div>
              <div className="space-y-2">
                {recentlyViewed.map((site) => (
                  <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="p-3 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{site.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{site.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
