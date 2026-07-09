import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

const ADMIN_PASSWORD = 'Khalid124_';

export default function Admin({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('sites');
  const [sites, setSites] = useState([]);
  const [ads, setAds] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddAd, setShowAddAd] = useState(false);
  const [stats, setStats] = useState({
    totalSites: 0,
    totalViews: 0,
    totalClicks: 0,
    pendingWithdrawals: 0
  });

  const [newSite, setNewSite] = useState({
    name: '',
    slug: '',
    description: '',
    url: '',
    category: 'Government',
    owner_name: '',
    is_verified: false,
    is_sponsored: false
  });

  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: ''
  });

  const categories = [
    'Government', 'Corporate', 'Service', 'Charity', 'Community', 
    'Business', 'Build Project', 'Event', 'Politics', 'Creative', 
    'Emergency', 'Other'
  ];

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      fetchData();
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
  };

  const fetchData = async () => {
    const { data: sitesData } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
    setSites(sitesData || []);

    const { data: adsData } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setAds(adsData || []);

    const { data: withdrawalsData } = await supabase.from('pending_withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setWithdrawals(withdrawalsData || []);

    const { data: analyticsData } = await supabase.from('search_analytics').select('*').order('created_at', { ascending: false }).limit(50);
    setAnalytics(analyticsData || []);

    const totalViews = sitesData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sitesData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;
    
    setStats({
      totalSites: sitesData?.length || 0,
      totalViews,
      totalClicks,
      pendingWithdrawals: withdrawalsData?.length || 0
    });
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('sites').insert(newSite);
    if (!error) {
      // Send Discord notification
      try {
        await fetch('/api/discord-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `**New Site Added:** ${newSite.name}\nCategory: ${newSite.category}\nOwner: ${newSite.owner_name || 'Unknown'}`,
            color: 0x22c55e
          })
        });
      } catch (err) {
        console.error('Failed to send Discord notification', err);
      }

      setShowAddSite(false);
      setNewSite({ name: '', slug: '', description: '', url: '', category: 'Government', owner_name: '', is_verified: false, is_sponsored: false });
      fetchData();
    } else {
      alert('Error adding site: ' + error.message);
    }
  };

  const handleDeleteSite = async (id) => {
    if (confirm('Are you sure you want to delete this site?')) {
      await supabase.from('sites').delete().eq('id', id);
      fetchData();
    }
  };

  const handleToggleSponsored = async (id, currentStatus) => {
    await supabase.from('sites').update({ is_sponsored: !currentStatus }).eq('id', id);
    fetchData();
  };

  const handleToggleVerified = async (id, currentStatus) => {
    await supabase.from('sites').update({ is_verified: !currentStatus }).eq('id', id);
    fetchData();
  };

  const handleAddAd = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('ads').insert(newAd);
    if (!error) {
      setShowAddAd(false);
      setNewAd({ title: '', description: '', image_url: '', link_url: '' });
      fetchData();
    } else {
      alert('Error adding ad: ' + error.message);
    }
  };

  const handleDeleteAd = async (id) => {
    if (confirm('Are you sure you want to delete this ad?')) {
      await supabase.from('ads').delete().eq('id', id);
      fetchData();
    }
  };

  const handleToggleAdActive = async (id, currentStatus) => {
    await supabase.from('ads').update({ is_active: !currentStatus }).eq('id', id);
    fetchData();
  };

  const handleApproveWithdrawal = async (id, userId, amount) => {
    if (confirm(`Approve withdrawal of $${amount}?`)) {
      await supabase.from('pending_withdrawals').update({ status: 'approved' }).eq('id', id);
      
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
      if (balData) {
        await supabase.from('site_balances').update({ balance: balData.balance - amount }).eq('user_id', userId);
      }
      
      alert(`Approved! You now need to manually pay the user $${amount} in-game.`);
      fetchData();
    }
  };

  const handleRejectWithdrawal = async (id) => {
    if (confirm('Reject this withdrawal request?')) {
      await supabase.from('pending_withdrawals').update({ status: 'rejected' }).eq('id', id);
      fetchData();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-[#09090b] dark:to-[#111111] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/5 p-8">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-orange-500/10 rounded-full mb-4">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-xl mb-4 focus:outline-none focus:border-orange-500 transition-colors"
              autoFocus
            />
            <button type="submit" className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="bg-white dark:bg-[#111111] border-b border-neutral-200 dark:border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/assets/logo.png" alt="Z&E Net" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-mono text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
            <button onClick={toggleTheme} className="text-sm font-mono text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
            <button onClick={handleLogout} className="text-sm font-mono text-red-500 hover:text-red-600 transition-colors tracking-wide">LOGOUT</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Sites</span>
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <p className="text-3xl font-bold">{stats.totalSites}</p>
          </div>

          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Views</span>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-3xl font-bold">{stats.totalViews}</p>
          </div>

          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Clicks</span>
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-3xl font-bold">{stats.totalClicks}</p>
          </div>

          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Pending Withdrawals</span>
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold">{stats.pendingWithdrawals}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-neutral-200 dark:border-white/5">
          {['sites', 'ads', 'withdrawals', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'sites' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Site Management</h2>
              <button onClick={() => setShowAddSite(!showAddSite)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                {showAddSite ? 'Cancel' : '+ Add Site'}
              </button>
            </div>

            {showAddSite && (
              <form onSubmit={handleAddSite} className="mb-6 p-6 bg-neutral-50 dark:bg-[#09090b] rounded-lg border border-neutral-200 dark:border-white/10">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Site Name</label>
                    <input
                      type="text"
                      placeholder="Enter site name"
                      value={newSite.name}
                      onChange={(e) => setNewSite({...newSite, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={newSite.url}
                      onChange={(e) => setNewSite({...newSite, url: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Owner Name</label>
                    <input
                      type="text"
                      placeholder="Owner name"
                      value={newSite.owner_name}
                      onChange={(e) => setNewSite({...newSite, owner_name: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={newSite.category}
                      onChange={(e) => setNewSite({...newSite, category: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    placeholder="Site description"
                    value={newSite.description}
                    onChange={(e) => setNewSite({...newSite, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                    rows="3"
                  />
                </div>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSite.is_verified}
                      onChange={(e) => setNewSite({...newSite, is_verified: e.target.checked})}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSite.is_sponsored}
                      onChange={(e) => setNewSite({...newSite, is_sponsored: e.target.checked})}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Sponsored</span>
                  </label>
                </div>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Add Site
                </button>
              </form>
            )}

            <div className="space-y-3">
              {sites.map((site) => (
                <div key={site.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{site.name}</h3>
                        {site.is_verified && (
                          <span className="px-2 py-0.5 text-xs font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded">✓ Verified</span>
                        )}
                        {site.is_sponsored && (
                          <span className="px-2 py-0.5 text-xs font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded">SPONSORED</span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{site.description}</p>
                      <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono">
                        <span>{site.category}</span>
                        <span>•</span>
                        <span>{site.owner_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{site.view_count || 0} views</span>
                        <span>•</span>
                        <span>{site.click_count || 0} clicks</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleVerified(site.id, site.is_verified)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          site.is_verified 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-orange-500 hover:text-white'
                        }`}
                      >
                        {site.is_verified ? 'Verified' : 'Verify'}
                      </button>
                      <button
                        onClick={() => handleToggleSponsored(site.id, site.is_sponsored)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          site.is_sponsored 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-orange-500 hover:text-white'
                        }`}
                      >
                        {site.is_sponsored ? 'Sponsored' : 'Sponsor'}
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Ad Management</h2>
              <button onClick={() => setShowAddAd(!showAddAd)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                {showAddAd ? 'Cancel' : '+ Add Ad'}
              </button>
            </div>

            {showAddAd && (
              <form onSubmit={handleAddAd} className="mb-6 p-6 bg-neutral-50 dark:bg-[#09090b] rounded-lg border border-neutral-200 dark:border-white/10">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Title</label>
                    <input
                      type="text"
                      placeholder="Ad title"
                      value={newAd.title}
                      onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Link URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={newAd.link_url}
                      onChange={(e) => setNewAd({...newAd, link_url: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={newAd.image_url}
                    onChange={(e) => setNewAd({...newAd, image_url: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    placeholder="Ad description"
                    value={newAd.description}
                    onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                    rows="2"
                  />
                </div>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Add Ad
                </button>
              </form>
            )}

            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{ad.description}</p>
                      <div className="text-xs text-neutral-500 font-mono">
                        {ad.link_url} • {ad.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleAdActive(ad.id, ad.is_active)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          ad.is_active 
                            ? 'bg-green-600 text-white' 
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <h2 className="text-xl font-bold mb-6">Pending Withdrawals</h2>
            {withdrawals.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No pending withdrawals</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm text-neutral-500 mb-1">User: {w.user_id.slice(0, 8)}...</p>
                        <p className="text-2xl font-bold text-orange-500">${w.amount.toFixed(2)}</p>
                        <p className="text-xs text-neutral-500 mt-1">{new Date(w.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveWithdrawal(w.id, w.user_id, w.amount)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(w.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 p-6">
            <h2 className="text-xl font-bold mb-6">Recent Search Analytics</h2>
            {analytics.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No analytics data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics.map((a, i) => (
                  <div key={i} className="p-3 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.query}</p>
                      <p className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-sm text-neutral-500">{a.results_count} results</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
