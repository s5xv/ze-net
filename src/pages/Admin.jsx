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
  const [mcName, setMcName] = useState('Admin');
  
  // Data states
  const [sites, setSites] = useState([]);
  const [ads, setAds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, totalViews: 0, totalClicks: 0 });

  // Form states
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', description: '', category: 'Other', owner_discord_id: '', shortcuts: '' });
  
  const [showAddAd, setShowAddAd] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', description: '', link_url: '' });

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') { setIsAuthenticated(true); fetchData(); }
  }, []);

  useEffect(() => {
    if (user && isAuthenticated) {
      const fetchMC = async () => {
        try {
          const { data: tokenData } = await supabase.from('treasury_tokens').select('account_id').eq('user_id', user.id).single();
          if (tokenData?.account_id) {
            const res = await fetch(`/api?endpoint=mc-profile&uuid=${tokenData.account_id}`);
            if (res.ok) { const d = await res.json(); if (d.name) setMcName(d.name); }
          }
        } catch (e) { console.error(e); }
      };
      fetchMC();
    }
  }, [user, isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { setIsAuthenticated(true); localStorage.setItem('admin_auth', 'true'); fetchData(); }
    else { alert('Incorrect password'); }
  };

  const fetchData = async () => {
    const { data: sitesData } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
    setSites(sitesData || []);
    const { data: adsData } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setAds(adsData || []);
    const { data: messagesData } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setMessages(messagesData || []);
    
    const totalViews = sitesData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sitesData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;
    setStats({ totalSites: sitesData?.length || 0, totalViews, totalClicks });
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    const shortcutsArray = newSite.shortcuts.split(',').map(s => s.trim()).filter(s => s);
    const { error } = await supabase.from('sites').insert({ ...newSite, shortcuts: shortcutsArray });
    if (error) alert('Error: ' + error.message);
    else { setShowAddSite(false); setNewSite({ name: '', description: '', category: 'Other', owner_discord_id: '', shortcuts: '' }); fetchData(); }
  };

  const handleAddAd = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('ads').insert(newAd);
    if (error) alert('Error: ' + error.message);
    else { setShowAddAd(false); setNewAd({ title: '', description: '', link_url: '' }); fetchData(); }
  };

  const handleDelete = async (table, id) => {
    if (confirm('Delete this item?')) {
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    }
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard ({mcName})</h1>
          <button onClick={() => { localStorage.removeItem('admin_auth'); setIsAuthenticated(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {['sites', 'ads', 'messages', 'users', 'wiki'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'sites' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Site Management</h2>
              <button onClick={() => setShowAddSite(!showAddSite)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">{showAddSite ? 'Cancel' : '+ Add Site'}</button>
            </div>
            {showAddSite && (
              <form onSubmit={handleAddSite} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg space-y-4">
                <input type="text" placeholder="Site Name" value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <textarea placeholder="Description" value={newSite.description} onChange={(e) => setNewSite({...newSite, description: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" rows="3" required />
                <div className="grid grid-cols-2 gap-4">
                  <select value={newSite.category} onChange={(e) => setNewSite({...newSite, category: e.target.value})} className="px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg">
                    {['Government', 'Corporate', 'Service', 'Charity', 'Community', 'Business', 'Build Project', 'Event', 'Politics', 'Creative', 'Emergency', 'Other', 'Bank', 'Shop', 'Restaurant'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="Owner Discord ID" value={newSite.owner_discord_id} onChange={(e) => setNewSite({...newSite, owner_discord_id: e.target.value})} className="px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
                </div>
                <input type="text" placeholder="Shortcuts (comma separated)" value={newSite.shortcuts} onChange={(e) => setNewSite({...newSite, shortcuts: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Add Site</button>
              </form>
            )}
            <div className="space-y-3">
              {sites.map((site) => (
                <div key={site.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{site.name}</h3>
                    <p className="text-sm text-gray-500">{site.category} • {site.owner_discord_id ? `Owner: ${site.owner_discord_id.slice(0,8)}...` : 'No Owner'}</p>
                  </div>
                  <button onClick={() => handleDelete('sites', site.id)} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Ad Management</h2>
              <button onClick={() => setShowAddAd(!showAddAd)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">{showAddAd ? 'Cancel' : '+ Add Ad'}</button>
            </div>
            {showAddAd && (
              <form onSubmit={handleAddAd} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg space-y-4">
                <input type="text" placeholder="Ad Title" value={newAd.title} onChange={(e) => setNewAd({...newAd, title: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <textarea placeholder="Description" value={newAd.description} onChange={(e) => setNewAd({...newAd, description: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" rows="2" required />
                <input type="text" placeholder="Link URL" value={newAd.link_url} onChange={(e) => setNewAd({...newAd, link_url: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Add Ad</button>
              </form>
            )}
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{ad.title}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-md">{ad.link_url}</p>
                  </div>
                  <button onClick={() => handleDelete('ads', ad.id)} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Contact Messages</h2>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{msg.subject}</h3>
                    <button onClick={() => handleDelete('contact_messages', msg.id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">From: {msg.name} ({msg.email})</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Linked Users</h2>
            <p className="text-gray-500 mb-4">Users who have linked their Minecraft accounts.</p>
            <div className="space-y-3">
              {/* Placeholder for user list - requires fetching from treasury_tokens */}
              <p className="text-gray-500 italic">User management panel. (Check Supabase table 'treasury_tokens' for full list)</p>
            </div>
          </div>
        )}

        {activeTab === 'wiki' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Wiki Management</h2>
            <button onClick={() => fetch('/api?endpoint=wiki-scrape&action=all-pages').then(r => r.json()).then(d => alert(d.message))} className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Force Sync Wiki</button>
            <p className="text-gray-500">Use the /wiki page to view and manage individual wiki pages.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
