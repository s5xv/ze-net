import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const ADMIN_PASSWORD = 'Khalid124_';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('sites');
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, totalViews: 0, totalClicks: 0, pendingWithdrawals: 0 });
  const [users, setUsers] = useState([]);
  const [wikiPages, setWikiPages] = useState([]);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') { setIsAuthenticated(true); fetchData(); }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { setIsAuthenticated(true); localStorage.setItem('admin_auth', 'true'); fetchData(); }
    else { alert('Incorrect password'); }
  };

  const fetchData = async () => {
    const { data: sitesData } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
    setSites(sitesData || []);
    const totalViews = sitesData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sitesData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;
    const { data: usersData } = await supabase.from('users').select('id, mc_username').limit(100);
    setUsers(usersData || []);
    const { data: wikiData } = await supabase.from('wiki_pages').select('id, title, content').limit(100);
    setWikiPages(wikiData || []);

    setStats({ totalSites: sitesData?.length || 0, totalViews, totalClicks, pendingWithdrawals: 0 });
  };

  if (!isAuthenticated) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-[#303134] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
            <h1 className="text-3xl font-bold mb-4 text-center">Admin Access</h1>
            <form onSubmit={handleLogin}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-xl mb-4 focus:outline-none focus:border-blue-500" autoFocus />
              <button type="submit" className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">Login</button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm text-gray-500">Total Sites</span>
            <p className="text-3xl font-bold">{stats.totalSites}</p>
          </div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm text-gray-500">Total Views</span>
            <p className="text-3xl font-bold">{stats.totalViews}</p>
          </div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm text-gray-500">Total Clicks</span>
            <p className="text-3xl font-bold">{stats.totalClicks}</p>
          </div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm text-gray-500">Pending Withdrawals</span>
            <p className="text-3xl font-bold">{stats.pendingWithdrawals}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {['sites', 'ads', 'premium', 'announcements', 'requests', 'deposits', 'withdrawals', 'messages', 'analytics', 'users', 'wiki'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'sites' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Site Management</h2>
            <div className="space-y-3">
              {sites.map((site) => (
                <div key={site.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-lg">{site.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{site.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <h2 className="text-xl font-bold mb-6">User Management</h2>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm">{u.id.slice(0, 16)}...</p>
                    {u.mc_username && <p className="text-xs text-green-500">MC: {u.mc_username}</p>}
                  </div>
                  <button className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Ban User</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wiki' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <h2 className="text-xl font-bold mb-6">Wiki Management</h2>
            <button onClick={() => fetch('/api?endpoint=wiki-scrape&action=all-pages').then(r => r.json()).then(d => alert(d.message))} className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Force Sync Wiki</button>
            <div className="space-y-3">
              {wikiPages.map((p) => (
                <div key={p.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-neutral-500">{p.content ? 'Has Content' : 'Empty'}</p>
                  </div>
                  <button onClick={async () => { await supabase.from('wiki_pages').delete().eq('id', p.id); fetchData(); }} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
