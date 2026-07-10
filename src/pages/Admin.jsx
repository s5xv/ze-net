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
  
  const [sites, setSites] = useState([]);
  const [ads, setAds] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [premiumListings, setPremiumListings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [siteRequests, setSiteRequests] = useState([]);
  const [manualDeposits, setManualDeposits] = useState([]);
  const [businessRegistrations, setBusinessRegistrations] = useState([]);
  const [adSubmissions, setAdSubmissions] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, totalViews: 0, totalClicks: 0, pendingWithdrawals: 0 });

  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddAd, setShowAddAd] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showManualDeposit, setShowManualDeposit] = useState(false);
  
  const [newSite, setNewSite] = useState({ name: '', description: '', category: 'Other', owner_discord_id: '', shortcuts: '', url: '' });
  const [newAd, setNewAd] = useState({ title: '', description: '', link_url: '', image_url: '', tier: 'bronze' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [manualDeposit, setManualDeposit] = useState({ userId: '', amount: '', reason: '', notes: '' });
  const [newPremium, setNewPremium] = useState({ siteId: '', tier: 'basic', days: 30 });

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
    const { data: withdrawalsData } = await supabase.from('pending_withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setWithdrawals(withdrawalsData || []);
    const { data: analyticsData } = await supabase.from('search_analytics').select('*').order('created_at', { ascending: false }).limit(50);
    setAnalytics(analyticsData || []);
    const { data: messagesData } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setMessages(messagesData || []);
    const { data: premiumData } = await supabase.from('premium_listings').select('*, sites(name)').order('created_at', { ascending: false });
    setPremiumListings(premiumData || []);
    const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(announcementsData || []);
    const { data: siteRequestsData } = await supabase.from('site_requests').select('*').order('created_at', { ascending: false });
    setSiteRequests(siteRequestsData || []);
    const { data: manualDepositsData } = await supabase.from('manual_deposits').select('*').order('created_at', { ascending: false }).limit(50);
    setManualDeposits(manualDepositsData || []);
    const { data: businessData } = await supabase.from('business_registrations').select('*').order('created_at', { ascending: false });
    setBusinessRegistrations(businessData || []);
    const { data: adSubData } = await supabase.from('ad_submissions').select('*').order('created_at', { ascending: false });
    setAdSubmissions(adSubData || []);

    const totalViews = sitesData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sitesData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;
    setStats({ totalSites: sitesData?.length || 0, totalViews, totalClicks, pendingWithdrawals: withdrawalsData?.length || 0 });
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    const shortcutsArray = newSite.shortcuts.split(',').map(s => s.trim()).filter(s => s);
    const { error } = await supabase.from('sites').insert({ ...newSite, shortcuts: shortcutsArray, url: newSite.url });
    if (error) alert('Error: ' + error.message);
    else { setShowAddSite(false); setNewSite({ name: '', description: '', category: 'Other', owner_discord_id: '', shortcuts: '', url: '' }); fetchData(); }
  };

  const handleAddAd = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('ads').insert({ ...newAd, is_active: true });
    if (error) alert('Error: ' + error.message);
    else { setShowAddAd(false); setNewAd({ title: '', description: '', link_url: '', image_url: '', tier: 'bronze' }); fetchData(); }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert(newAnnouncement);
    if (error) alert('Error: ' + error.message);
    else { setShowAddAnnouncement(false); setNewAnnouncement({ title: '', message: '' }); fetchData(); }
  };

  const handleAddPremium = async () => {
    if (!newPremium.siteId || !newPremium.days) return alert('Select site and days');
    const endDate = new Date(); endDate.setDate(endDate.getDate() + newPremium.days);
    const { error } = await supabase.from('premium_listings').insert({ site_id: newPremium.siteId, tier: newPremium.tier, end_date: endDate.toISOString() });
    if (error) alert('Error: ' + error.message);
    else { setNewPremium({ siteId: '', tier: 'basic', days: 30 }); fetchData(); }
  };

  const handleManualDeposit = async (e) => {
    e.preventDefault();
    if (!manualDeposit.userId || !manualDeposit.amount) return alert('Enter user ID and amount');
    try {
      const res = await fetch('/api?endpoint=manual-deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: manualDeposit.userId, amount: parseFloat(manualDeposit.amount), reason: manualDeposit.reason, adminNotes: manualDeposit.notes }) });
      const data = await res.json();
      if (data.success) { alert(`Success! New balance: $${data.newBalance.toFixed(2)}`); setShowManualDeposit(false); setManualDeposit({ userId: '', amount: '', reason: '', notes: '' }); fetchData(); }
      else { alert('Error: ' + data.error); }
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDeleteAd = async (id) => {
    if (!confirm('Delete this ad?')) return;
    
    try {
      const res = await fetch('/api/delete-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Ad deleted successfully!');
        fetchData();
      } else {
        alert('Error deleting ad: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleAdActive = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/toggle-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: currentStatus })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (table, id) => {
    if (confirm('Delete this item?')) { 
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        alert('Error deleting: ' + error.message);
      } else {
        fetchData();
      }
    }
  };

  const handleApproveWithdrawal = async (id, userId, amount) => {
    if (confirm(`Approve withdrawal of $${amount}?`)) {
      await supabase.from('pending_withdrawals').update({ status: 'approved' }).eq('id', id);
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
      if (balData) await supabase.from('site_balances').update({ balance: balData.balance - amount }).eq('user_id', userId);
      alert('Approved! Pay user manually in-game.'); fetchData();
    }
  };

  const handleRejectWithdrawal = async (id) => {
    if (confirm('Reject withdrawal?')) { await supabase.from('pending_withdrawals').update({ status: 'rejected' }).eq('id', id); fetchData(); }
  };

  const handleApproveSiteRequest = async (req) => {
    if (confirm('Approve site request?')) {
      await supabase.from('sites').insert({ name: req.site_name, slug: req.site_name.toLowerCase().replace(/\s+/g, '-'), description: req.description || '', url: req.site_url, urls: [{ label: 'Website', url: req.site_url }], category: 'Other', owner_name: '', is_verified: false, is_sponsored: false });
      await supabase.from('site_requests').update({ status: 'approved' }).eq('id', req.id);
      fetchData();
    }
  };

  const handleRejectSiteRequest = async (id) => {
    if (confirm('Reject site request?')) { await supabase.from('site_requests').update({ status: 'rejected' }).eq('id', id); fetchData(); }
  };

  const handleApproveBusiness = async (id) => {
    if (confirm('Approve this business registration?')) {
      await supabase.from('business_registrations').update({ status: 'approved' }).eq('id', id);
      fetchData();
    }
  };

  const handleRejectBusiness = async (id) => {
    if (confirm('Reject this business registration?')) {
      await supabase.from('business_registrations').delete().eq('id', id);
      fetchData();
    }
  };

  const handleApproveAd = async (submission) => {
    if (!confirm(`Approve this ad? This will deduct $${submission.tier === 'gold' ? 2500 : submission.tier === 'silver' ? 1200 : submission.tier === 'platinum' ? 5000 : 500} from their balance.`)) return;
    
    const price = submission.tier === 'gold' ? 2500 : submission.tier === 'silver' ? 1200 : submission.tier === 'platinum' ? 5000 : 500;
    
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', submission.user_id).single();
    if (!balData || balData.balance < price) {
      alert('User has insufficient balance');
      return;
    }
    
    await supabase.from('site_balances').update({ balance: balData.balance - price }).eq('user_id', submission.user_id);
    
    await supabase.from('ads').insert({
      title: submission.company_name,
      description: `Sponsored by ${submission.company_name}`,
      link_url: submission.redirect_url,
      image_url: submission.banner_image,
      tier: submission.tier,
      is_active: true
    });
    
    await supabase.from('ad_submissions').delete().eq('id', submission.id);
    
    fetchData();
  };

  const handleRejectAd = async (id) => {
    if (confirm('Reject this ad submission?')) {
      await supabase.from('ad_submissions').delete().eq('id', id);
      fetchData();
    }
  };

  const handleSendWeeklyAnalytics = async () => {
    try {
      const res = await fetch('/api?endpoint=weekly-analytics', { method: 'POST' });
      const data = await res.json();
      if (data.success) alert('Weekly analytics sent to Discord!');
      else alert('Error: ' + data.error);
    } catch (err) {
      alert('Error: ' + err.message);
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
          <div className="flex gap-2">
            <button onClick={handleSendWeeklyAnalytics} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">Send Weekly Analytics</button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); setIsAuthenticated(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"><span className="text-sm text-gray-500">Total Sites</span><p className="text-3xl font-bold">{stats.totalSites}</p></div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"><span className="text-sm text-gray-500">Total Views</span><p className="text-3xl font-bold">{stats.totalViews}</p></div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"><span className="text-sm text-gray-500">Total Clicks</span><p className="text-3xl font-bold">{stats.totalClicks}</p></div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"><span className="text-sm text-gray-500">Pending Withdrawals</span><p className="text-3xl font-bold">{stats.pendingWithdrawals}</p></div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {['sites', 'ads', 'premium', 'announcements', 'requests', 'business', 'ad-submissions', 'deposits', 'withdrawals', 'messages', 'analytics', 'users', 'wiki'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

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
                <input type="text" placeholder="Image URL" value={newAd.image_url} onChange={(e) => setNewAd({...newAd, image_url: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
                <input type="text" placeholder="Link URL" value={newAd.link_url} onChange={(e) => setNewAd({...newAd, link_url: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <select value={newAd.tier} onChange={(e) => setNewAd({...newAd, tier: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg">
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Add Ad</button>
              </form>
            )}
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{ad.title}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-md">{ad.link_url}</p>
                    <p className="text-xs text-gray-400">Tier: {ad.tier || 'bronze'} • Status: {ad.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdActive(ad.id, ad.is_active)} className={`px-3 py-1.5 text-xs rounded-lg ${ad.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                      {ad.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteAd(ad.id)} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... rest of the tabs ... */}
      </div>
    </Layout>
  );
}
