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
  const [verificationRequests, setVerificationRequests] = useState([]);
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
    const { data: verifData } = await supabase.from('site_verification_requests').select('*').order('created_at', { ascending: false });
    setVerificationRequests(verifData || []);

    const totalViews = sitesData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sitesData?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;
    setStats({ totalSites: sitesData?.length || 0, totalViews, totalClicks, pendingWithdrawals: withdrawalsData?.length || 0 });
  };

  // --- Handlers ---
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
      const res = await fetch('/api/delete-ad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (data.success) { alert('Ad deleted!'); fetchData(); } else { alert('Error: ' + data.error); }
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleToggleAdActive = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/toggle-ad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: currentStatus }) });
      const data = await res.json();
      if (data.success) { alert(data.message); fetchData(); } else { alert('Error: ' + data.error); }
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDelete = async (table, id) => {
    if (confirm('Delete this item?')) { 
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) alert('Error deleting: ' + error.message);
      else fetchData();
    }
  };

  const handleApproveWithdrawal = async (id, userId, amount) => {
    if (confirm(`Approve withdrawal of $${amount}?`)) {
      await supabase.from('pending_withdrawals').update({ status: 'approved' }).eq('id', id);
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
      if (balData) await supabase.from('site_balances').update({ balance: balData.balance - amount }).eq('user_id', userId);
      alert('Approved!'); fetchData();
    }
  };

  const handleRejectWithdrawal = async (id) => {
    if (confirm('Reject?')) { await supabase.from('pending_withdrawals').update({ status: 'rejected' }).eq('id', id); fetchData(); }
  };

  const handleApproveSiteRequest = async (req) => {
    if (confirm('Approve?')) {
      await supabase.from('sites').insert({ name: req.site_name, slug: req.site_name.toLowerCase().replace(/\s+/g, '-'), description: req.description || '', url: req.site_url, category: 'Other', is_verified: false });
      await supabase.from('site_requests').update({ status: 'approved' }).eq('id', req.id);
      fetchData();
    }
  };

  const handleRejectSiteRequest = async (id) => {
    if (confirm('Reject?')) { await supabase.from('site_requests').update({ status: 'rejected' }).eq('id', id); fetchData(); }
  };

  const handleApproveBusiness = async (id) => {
    if (confirm('Approve?')) { await supabase.from('business_registrations').update({ status: 'approved' }).eq('id', id); fetchData(); }
  };

  const handleRejectBusiness = async (id) => {
    if (confirm('Reject?')) { await supabase.from('business_registrations').delete().eq('id', id); fetchData(); }
  };

  const handleApproveAd = async (submission) => {
    const price = submission.tier === 'gold' ? 2500 : submission.tier === 'silver' ? 1200 : submission.tier === 'platinum' ? 5000 : 500;
    if (!confirm(`Approve? Deducts $${price}.`)) return;
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', submission.user_id).single();
    if (!balData || balData.balance < price) return alert('Insufficient balance');
    await supabase.from('site_balances').update({ balance: balData.balance - price }).eq('user_id', submission.user_id);
    await supabase.from('ads').insert({ title: submission.company_name, description: `Sponsored by ${submission.company_name}`, link_url: submission.redirect_url, image_url: submission.banner_image, tier: submission.tier, is_active: true });
    await supabase.from('ad_submissions').delete().eq('id', submission.id);
    fetchData();
  };

  const handleRejectAd = async (id) => {
    if (confirm('Reject?')) { await supabase.from('ad_submissions').delete().eq('id', id); fetchData(); }
  };

  // --- NEW: Verification Handlers ---
  const handleApproveVerification = async (req) => {
    if (!confirm(`Approve verification for "${req.site_name}"? This will deduct $100 from their balance.`)) return;
    
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', req.user_id).single();
    if (!balData || balData.balance < 100) return alert('User has insufficient balance ($100 required).');
    
    // Deduct $100
    await supabase.from('site_balances').update({ balance: balData.balance - 100 }).eq('user_id', req.user_id);
    
    // Find the site and set is_verified = true (or create it if it doesn't exist)
    const { data: existingSite } = await supabase.from('sites').select('id').eq('name', req.site_name).single();
    if (existingSite) {
      await supabase.from('sites').update({ is_verified: true }).eq('id', existingSite.id);
    } else {
      await supabase.from('sites').insert({ name: req.site_name, slug: req.site_name.toLowerCase().replace(/\s+/g, '-'), url: req.site_url || '', is_verified: true, category: 'Other' });
    }
    
    await supabase.from('site_verification_requests').update({ status: 'approved' }).eq('id', req.id);
    alert('Verified! $100 deducted and badge added.');
    fetchData();
  };

  const handleRejectVerification = async (id) => {
    if (confirm('Reject verification request? No money will be deducted.')) {
      await supabase.from('site_verification_requests').update({ status: 'rejected' }).eq('id', id);
      fetchData();
    }
  };

  const handleSendWeeklyAnalytics = async () => {
    try {
      const res = await fetch('/api?endpoint=weekly-analytics', { method: 'POST' });
      const data = await res.json();
      if (data.success) alert('Sent!'); else alert('Error: ' + data.error);
    } catch (err) { alert('Error: ' + err.message); }
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
          {['sites', 'ads', 'premium', 'announcements', 'requests', 'business', 'ad-submissions', 'verifications', 'deposits', 'withdrawals', 'messages', 'analytics', 'users', 'wiki'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* SITES TAB */}
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
                <input type="text" placeholder="URL" value={newSite.url} onChange={(e) => setNewSite({...newSite, url: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
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
                  <div><h3 className="font-semibold">{site.name} {site.is_verified && <span className="text-blue-500">✓</span>}</h3><p className="text-sm text-gray-500">{site.category}</p></div>
                  <button onClick={() => handleDelete('sites', site.id)} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADS TAB */}
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
                  <option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option>
                </select>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Add Ad</button>
              </form>
            )}
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{ad.title}</h3><p className="text-xs text-gray-400">Tier: {ad.tier} • {ad.is_active ? 'Active' : 'Inactive'}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdActive(ad.id, ad.is_active)} className={`px-3 py-1.5 text-xs rounded-lg ${ad.is_active ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>{ad.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => handleDeleteAd(ad.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VERIFICATIONS TAB (NEW) */}
        {activeTab === 'verifications' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Site Verifications ({verificationRequests.filter(r => r.status === 'pending').length} pending)</h2>
            {verificationRequests.length === 0 ? <p className="text-gray-500 text-center py-12">No requests</p> : (
              <div className="space-y-3">
                {verificationRequests.map((req) => (
                  <div key={req.id} className={`p-4 border rounded-lg ${req.status === 'pending' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-gray-50 dark:bg-[#202124]'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{req.site_name}</h3>
                          {req.status === 'pending' && <span className="px-2 py-0.5 text-xs font-bold text-blue-600 bg-blue-500/10 rounded">PENDING</span>}
                          {req.status === 'approved' && <span className="px-2 py-0.5 text-xs font-bold text-green-600 bg-green-500/10 rounded">APPROVED</span>}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">URL: {req.site_url || 'None'}</p>
                        <p className="text-xs text-gray-400">User ID: {req.user_id?.slice(0,8)}...</p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveVerification(req)} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">Approve (-$100)</button>
                          <button onClick={() => handleRejectVerification(req.id)} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PREMIUM TAB */}
        {activeTab === 'premium' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Premium Listings</h2>
            <div className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <div className="grid md:grid-cols-3 gap-4">
                <select value={newPremium.siteId} onChange={(e) => setNewPremium({...newPremium, siteId: e.target.value})} className="px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg"><option value="">Select Site</option>{sites.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select>
                <select value={newPremium.tier} onChange={(e) => setNewPremium({...newPremium, tier: e.target.value})} className="px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg"><option value="basic">Basic</option><option value="elite">Elite</option></select>
                <input type="number" placeholder="Days" value={newPremium.days || ''} onChange={(e) => setNewPremium({...newPremium, days: parseInt(e.target.value) || 0})} className="px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
              </div>
              <button onClick={handleAddPremium} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Add Premium</button>
            </div>
            <div className="space-y-3">
              {premiumListings.map((listing) => (
                <div key={listing.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{listing.sites?.name}</h3><p className="text-sm text-gray-500">{listing.tier} • {new Date(listing.end_date).toLocaleDateString()}</p></div>
                  <button onClick={async () => { await supabase.from('premium_listings').delete().eq('id', listing.id); fetchData(); }} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Announcements</h2>
              <button onClick={() => setShowAddAnnouncement(!showAddAnnouncement)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{showAddAnnouncement ? 'Cancel' : '+ Add'}</button>
            </div>
            {showAddAnnouncement && (
              <form onSubmit={handleAddAnnouncement} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg space-y-4">
                <input type="text" placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <textarea placeholder="Message" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" rows="3" required />
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg">Add</button>
              </form>
            )}
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{ann.title}</h3><p className="text-sm text-gray-500">{ann.message}</p></div>
                  <button onClick={() => handleDelete('announcements', ann.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Site Requests</h2>
            <div className="space-y-3">
              {siteRequests.map((req) => (
                <div key={req.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{req.site_name}</h3><p className="text-xs text-gray-500">{req.status}</p></div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveSiteRequest(req)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg">Approve</button>
                      <button onClick={() => handleRejectSiteRequest(req.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUSINESS TAB */}
        {activeTab === 'business' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Business Registrations</h2>
            <div className="space-y-3">
              {businessRegistrations.map((reg) => (
                <div key={reg.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{reg.business_name}</h3><p className="text-xs text-gray-500">{reg.category} • Plot: {reg.plot_number || 'N/A'} • Shortcut: {reg.shortcut || 'N/A'}</p></div>
                  {reg.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveBusiness(reg.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg">Approve</button>
                      <button onClick={() => handleRejectBusiness(reg.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AD SUBMISSIONS TAB */}
        {activeTab === 'ad-submissions' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Ad Submissions</h2>
            <div className="space-y-3">
              {adSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><h3 className="font-semibold">{sub.company_name}</h3><p className="text-xs text-gray-500">Tier: {sub.tier}</p></div>
                  {sub.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveAd(sub)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg">Approve</button>
                      <button onClick={() => handleRejectAd(sub.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEPOSITS TAB */}
        {activeTab === 'deposits' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Manual Deposits</h2>
              <button onClick={() => setShowManualDeposit(!showManualDeposit)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{showManualDeposit ? 'Cancel' : '+ Deposit'}</button>
            </div>
            {showManualDeposit && (
              <form onSubmit={handleManualDeposit} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg space-y-4">
                <input type="text" placeholder="User ID" value={manualDeposit.userId} onChange={(e) => setManualDeposit({...manualDeposit, userId: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <input type="number" step="0.01" placeholder="Amount" value={manualDeposit.amount} onChange={(e) => setManualDeposit({...manualDeposit, amount: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg">Process</button>
              </form>
            )}
            <div className="space-y-3">
              {manualDeposits.map((dep) => (
                <div key={dep.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500">User: {dep.user_id?.slice(0,8)}...</p>
                  <p className="text-xl font-bold text-green-600">${dep.amount?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Withdrawals</h2>
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><p className="text-sm text-gray-500">User: {w.user_id?.slice(0,8)}...</p><p className="text-xl font-bold text-orange-600">${w.amount?.toFixed(2)}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveWithdrawal(w.id, w.user_id, w.amount)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg">Approve</button>
                    <button onClick={() => handleRejectWithdrawal(w.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Messages</h2>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-start">
                  <div><h3 className="font-semibold">{msg.subject}</h3><p className="text-xs text-gray-500">From: {msg.name}</p><p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{msg.message}</p></div>
                  <button onClick={() => handleDelete('contact_messages', msg.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Search Analytics</h2>
            <div className="space-y-2">
              {analytics.map((a, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center">
                  <div><p className="font-medium">{a.query}</p><p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p></div>
                  <span className="text-sm text-gray-500">{a.results_count} results</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Linked Users</h2>
            <p className="text-gray-500">Check Supabase 'treasury_tokens' table for full list.</p>
          </div>
        )}

        {/* WIKI TAB */}
        {activeTab === 'wiki' && (
          <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Wiki Management</h2>
            <button onClick={() => fetch('/api?endpoint=wiki-scrape&action=all-pages').then(r => r.json()).then(d => alert(d.message))} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Force Sync Wiki</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
