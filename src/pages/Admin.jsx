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
  const [sites, setSites] = useState([]);
  const [ads, setAds] = useState([]);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddAd, setShowAddAd] = useState(false);
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
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('sites').insert(newSite);
    if (!error) {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="bg-white dark:bg-[#111111] p-8 rounded-xl border border-neutral-200 dark:border-white/5 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
              autoFocus
            />
            <button type="submit" className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex justify-end gap-4 px-6 py-4">
        <a href="/" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
        <button onClick={handleLogout} className="text-sm font-mono font-medium text-red-500 hover:text-red-600 transition-colors tracking-wide">LOGOUT</button>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Sites Management */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Sites ({sites.length})</h2>
            <button onClick={() => setShowAddSite(!showAddSite)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm">
              {showAddSite ? 'Cancel' : 'Add Site'}
            </button>
          </div>

          {showAddSite && (
            <form onSubmit={handleAddSite} className="mb-6 p-4 bg-neutral-50 dark:bg-[#09090b] rounded-lg border border-neutral-200 dark:border-white/10">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Site Name"
                  value={newSite.name}
                  onChange={(e) => setNewSite({...newSite, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={newSite.url}
                  onChange={(e) => setNewSite({...newSite, url: e.target.value})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Owner Name"
                  value={newSite.owner_name}
                  onChange={(e) => setNewSite({...newSite, owner_name: e.target.value})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                />
                <select
                  value={newSite.category}
                  onChange={(e) => setNewSite({...newSite, category: e.target.value})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="Government">Government</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Service">Service</option>
                </select>
              </div>
              <textarea
                placeholder="Description"
                value={newSite.description}
                onChange={(e) => setNewSite({...newSite, description: e.target.value})}
                className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
                rows="3"
              />
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSite.is_verified}
                    onChange={(e) => setNewSite({...newSite, is_verified: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Verified</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSite.is_sponsored}
                    onChange={(e) => setNewSite({...newSite, is_sponsored: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Sponsored</span>
                </label>
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                Add Site
              </button>
            </form>
          )}

          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{site.name}</h3>
                      {site.is_verified && <span className="text-xs text-orange-500">✓</span>}
                      {site.is_sponsored && <span className="px-2 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded uppercase">Sponsored</span>}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{site.description}</p>
                    <div className="text-xs text-neutral-500 font-mono">
                      {site.category} • {site.owner_name || 'Unknown'} • Views: {site.view_count} • Clicks: {site.click_count}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleVerified(site.id, site.is_verified)}
                      className={`px-3 py-1 text-xs rounded ${site.is_verified ? 'bg-orange-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {site.is_verified ? 'Verified' : 'Verify'}
                    </button>
                    <button
                      onClick={() => handleToggleSponsored(site.id, site.is_sponsored)}
                      className={`px-3 py-1 text-xs rounded ${site.is_sponsored ? 'bg-orange-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {site.is_sponsored ? 'Sponsored' : 'Sponsor'}
                    </button>
                    <button
                      onClick={() => handleDeleteSite(site.id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ads Management */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Ads ({ads.length})</h2>
            <button onClick={() => setShowAddAd(!showAddAd)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm">
              {showAddAd ? 'Cancel' : 'Add Ad'}
            </button>
          </div>

          {showAddAd && (
            <form onSubmit={handleAddAd} className="mb-6 p-4 bg-neutral-50 dark:bg-[#09090b] rounded-lg border border-neutral-200 dark:border-white/10">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Ad Title"
                  value={newAd.title}
                  onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Link URL"
                  value={newAd.link_url}
                  onChange={(e) => setNewAd({...newAd, link_url: e.target.value})}
                  className="px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Image URL"
                value={newAd.image_url}
                onChange={(e) => setNewAd({...newAd, image_url: e.target.value})}
                className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
              />
              <textarea
                placeholder="Description"
                value={newAd.description}
                onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
                rows="2"
              />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                Add Ad
              </button>
            </form>
          )}

          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <h3 className="font-semibold mb-1">{ad.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{ad.description}</p>
                    <div className="text-xs text-neutral-500 font-mono">
                      {ad.link_url} • {ad.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAdActive(ad.id, ad.is_active)}
                      className={`px-3 py-1 text-xs rounded ${ad.is_active ? 'bg-green-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
