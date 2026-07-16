import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImageUpload from '../components/ImageUpload';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { apiFetch } from '../services/api';

const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD;

function hasAdminPassword() {
  return ADMIN_PW && localStorage.getItem('admin_pw') === ADMIN_PW;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [adRequests, setAdRequests] = useState([]);
  const [sites, setSites] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [reports, setReports] = useState([]);
  const [managedAds, setManagedAds] = useState({ sites: [], ads: [] });
  const [messages, setMessages] = useState([]);
  const [pendingSites, setPendingSites] = useState([]);
  const [businessRegistrations, setBusinessRegistrations] = useState([]);
  const [staffActions, setStaffActions] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [newSite, setNewSite] = useState({ name: '', url: '', category: 'Other', description: '', owner_id: '', owner_discord: '', discord_id: '', plot_number: '', shortcut: '', discord_invite: '', keywords: '' });
  const [lookupResults, setLookupResults] = useState([]);
  const [editingSite, setEditingSite] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [adImageUrl, setAdImageUrl] = useState('');
  const [editingAdImage, setEditingAdImage] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordOk, setPasswordOk] = useState(hasAdminPassword());
  const [userPermissions, setUserPermissions] = useState(null);

  const fetchData = async (tab) => {
    setLoading(true);
    setMessage('');
    try {
      const { count: wdCount } = await supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: vfCount } = await supabase.from('site_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: adCount } = await supabase.from('ad_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStats({
        pendingWithdrawals: wdCount || 0,
        pendingVerifications: vfCount || 0,
        pendingAds: adCount || 0,
        totalSites: siteCount || 0,
        totalUsers: userCount || 0
      });

      if (tab === 'withdrawals') {
        const { data } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
        setWithdrawals(data || []);
      } else if (tab === 'verifications') {
        const { data } = await supabase.from('site_verification_requests').select('*').order('created_at', { ascending: false });
        setVerifications(data || []);
      } else if (tab === 'ads') {
        const { data } = await supabase.from('ad_requests').select('*').order('created_at', { ascending: false });
        setAdRequests(data || []);
      } else if (tab === 'pending') {
        const { data } = await supabase.from('sites').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        setPendingSites(data || []);
      } else if (tab === 'sites') {
        try {
          const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
          console.log('Admin sites direct query:', data, error);
          if (error) throw error;
          setSites(data || []);
          if (!data || data.length === 0) setMessage('No sites found');
        } catch (e) { setMessage('Error: ' + e.message); }
      } else if (tab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setProfiles(data || []);
      } else if (tab === 'transactions') {
        const { data: tx } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
        const { data: txProfiles } = await supabase.from('profiles').select('id, username');
        const txProfileMap = Object.fromEntries((txProfiles || []).map(p => [p.id, p.username]));
        (tx || []).forEach(t => t.profiles = { username: txProfileMap[t.user_id] || 'Unknown' });
        setTransactions(tx || []);
      } else if (tab === 'staff') {
        const [staffRes, allProfilesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('is_staff', true),
          supabase.from('profiles').select('*').order('username')
        ]);
        setStaff(staffRes.data || []);
        setProfiles(allProfilesRes.data || []);
      } else if (tab === 'moderation') {
        const [repRes, profRes, siteRes] = await Promise.all([
          supabase.from('site_reports').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('profiles').select('id, username'),
          supabase.from('sites').select('id, name, slug')
        ]);
        const reports = repRes.data || [];
        const profiles = Object.fromEntries((profRes.data || []).map(p => [p.id, p.username]));
        const sites = Object.fromEntries((siteRes.data || []).map(s => [s.id, s]));
        reports.forEach(r => { r.profiles = { username: profiles[r.user_id] || 'Unknown' }; r.sites = sites[r.site_id] || null; });
        setReports(reports);
      } else if (tab === 'businesses') {
        const { data } = await supabase.from('business_registrations').select('*').order('created_at', { ascending: false });
        setBusinessRegistrations(data || []);
      } else if (tab === 'messages') {
        const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
        setMessages(data || []);
      } else if (tab === 'manage-ads') {
        const { data: allSites } = await supabase.from('sites').select('id, name, slug, ad_tier, ad_expires_at, url').order('name');
        const { data: allAds } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
        setManagedAds({ sites: allSites || [], ads: allAds || [] });
      } else if (tab === 'payouts') {
        const [saRes, pfRes] = await Promise.all([
          supabase.from('staff_actions').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('profiles').select('id, username')
        ]);
        setStaffActions(saRes.data || []);
        const pm = {};
        (pfRes.data || []).forEach(p => pm[p.id] = p.username);
        setProfilesMap(pm);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  const [dbStaffChecked, setDbStaffChecked] = useState(false);

  const checkStaffAccess = useCallback(async () => {
    const { data: profile } = await supabase.from('profiles').select('is_staff, staff_permissions').eq('id', user.id).maybeSingle();
    setDbStaffChecked(true);
    if (profile?.is_staff === true || (Array.isArray(profile?.staff_permissions) && profile.staff_permissions.length > 0)) {
      setAuthorized(true);
      setUserPermissions(profile.staff_permissions || []);
      return;
    }
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_staff', true);
    if (count === 0) {
      setAuthorized(true);
      setUserPermissions([]);
      return;
    }
    if (!ADMIN_PW) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (hasAdminPassword()) {
      setAuthorized(true);
      setUserPermissions([]);
      return;
    }
    checkStaffAccess();
  }, [user, authLoading, navigate, checkStaffAccess]);

  useEffect(() => {
    if (authorized) fetchData(activeTab);
  }, [activeTab, authorized]);

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PW) {
      localStorage.setItem('admin_pw', passwordInput);
      setPasswordOk(true);
      setPasswordError('');
      setAuthorized(true);
      setUserPermissions([]);
    } else {
      setPasswordError('Wrong password');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (ADMIN_PW && !authorized && !dbStaffChecked) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Checking...</div>;
  }

  if (ADMIN_PW && !authorized && dbStaffChecked && !passwordOk && !hasAdminPassword()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-4 text-center">Staff Access</h1>
          <p className="text-gray-400 text-sm mb-4 text-center">You don't have staff permissions on this site.</p>
          <input
            type="password"
            placeholder="Enter admin password (if you have one)"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white mb-3"
            autoFocus
          />
          {passwordError && <p className="text-red-400 text-sm mb-3">{passwordError}</p>}
          <button onClick={handlePasswordSubmit} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Enter</button>
        </div>
      </div>
    );
  }

  const handleWithdrawal = async (id, action) => {
    try {
      const data = await apiFetch('/api/economy', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve-withdrawal', withdrawalId: id, actionType: action })
      });
      setMessage(data.message || data.error);
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleModAction = async (report, action) => {
    try {
      if (action === 'remove') {
        await apiFetch('/api/app?action=admin-mod-action', { method: 'POST', body: JSON.stringify({ reportId: report.id, siteId: report.site_id, action: 'remove' }) });
      } else {
        await apiFetch('/api/app?action=admin-mod-action', { method: 'POST', body: JSON.stringify({ reportId: report.id, action: 'dismiss' }) });
      }
      fetchData(activeTab);
    } catch (err) { setMessage('Error: ' + err.message); }
  };

  const handleApproveVerification = async (verReq) => {
    try {
      const { error: deductErr } = await supabase.rpc('increment_balance', { target_user_id: verReq.user_id, deposit_amount: -100 });
      if (deductErr) throw new Error('Failed to deduct balance: ' + deductErr.message);
      await supabase.from('site_verification_requests').update({ status: 'approved' }).eq('id', verReq.id);
      if (verReq.site_id) {
        await supabase.from('sites').update({ is_verified: true, verification_paid_at: new Date().toISOString() }).eq('id', verReq.site_id);
      }
      await supabase.from('staff_actions').insert({
        staff_id: user.id,
        action_type: 'site_verify',
        reference_id: verReq.id?.toString(),
        description: `Verified site "${verReq.site_name || verReq.sites?.name}" — $40 commission`,
        amount: 40
      });
      setMessage('Verification approved. Deducted $100 from balance. Commission: $40');
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const getAdExpiry = (tier, adReq) => {
    const dur = adReq?.description?.match(/\|\|D:(\d+)/);
    const days = dur ? parseInt(dur[1]) : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const handleAdRequest = async (adReq, action) => {
    try {
      if (action === 'approve') {
        if (adReq.status !== 'pending') return setMessage('Ad already processed');
        const { error: deductErr } = await supabase.rpc('increment_balance', { target_user_id: adReq.user_id, deposit_amount: -adReq.price });
        if (deductErr) throw new Error('Failed to deduct balance: ' + deductErr.message);
        await supabase.from('ad_requests').update({ status: 'approved' }).eq('id', adReq.id);
        await supabase.from('sites').update({ 
          ad_tier: adReq.tier, 
          ad_price: adReq.price,
          image_url: adReq.image_url,
          ad_expires_at: getAdExpiry(adReq.tier, adReq)
        }).eq('id', adReq.site_id);
        const { data: site } = await supabase.from('sites').select('slug').eq('id', adReq.site_id).maybeSingle();
        await supabase.from('ads').insert({
          title: adReq.site_name || 'Sponsored',
          description: adReq.description || '',
          image_url: adReq.image_url || '',
          link_url: site?.slug ? `/site/${site.slug}` : '',
          tier: adReq.tier || 'standard',
          is_active: true
        });
        const commission = Math.round((adReq.price || 0) * 0.1 * 100) / 100;
        await supabase.from('staff_actions').insert({
          staff_id: user.id,
          action_type: 'ad_commission',
          reference_id: adReq.id?.toString(),
          description: `Approved ad for "${adReq.site_name}" ($${adReq.price} ${adReq.tier}) — 10% = $${commission}`,
          amount: commission
        });
        setMessage(`Ad approved. Deducted $${adReq.price} from balance. Commission: $${commission}`);
      } else {
        await supabase.from('ad_requests').update({ status: 'rejected' }).eq('id', adReq.id);
        setMessage('Ad rejected');
      }
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const toggleVerified = async (siteId, currentVal) => {
    try {
      await supabase.from('sites').update({ is_verified: !currentVal }).eq('id', siteId);
      setMessage(!currentVal ? 'Site verified' : 'Verification removed');
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const startEditSite = (site) => {
    setEditingSite(site.id);
    setEditForm({ name: site.name, url: site.url, category: site.category, description: site.description, plot_number: site.plot_number, shortcut: site.shortcut, discord_invite: site.discord_invite, keywords: site.keywords ? site.keywords.join(', ') : '' });
  };

  const saveEditSite = async (siteId) => {
    try {
      const keywords = editForm.keywords ? editForm.keywords.split(',').map(k => k.trim()).filter(Boolean) : null;
      await supabase.from('sites').update({ name: editForm.name, url: editForm.url, category: editForm.category, description: editForm.description, plot_number: editForm.plot_number, shortcut: editForm.shortcut, discord_invite: editForm.discord_invite, keywords }).eq('id', siteId);
      setEditingSite(null);
      setMessage('Site updated');
      fetchData(activeTab);
    } catch (err) { setMessage('Error: ' + err.message); }
  };

  const callAdmin = async (action, body) => {
    try {
      const data = await apiFetch('/api/app?action=' + action, { method: 'POST', body: JSON.stringify(body) });
      setMessage(data.message || data.error || 'Done');
      fetchData(activeTab);
    } catch (err) { setMessage('Error: ' + err.message); }
  };

  const approveSite = (siteId) => callAdmin('admin-approve-site', { siteId });
  const rejectSite = (siteId) => callAdmin('admin-reject-site', { siteId });

  const manualDeposit = async () => {
    if (!depositUserId || !depositAmount || Number(depositAmount) <= 0) { setMessage('Enter valid user and amount'); return; }
    await callAdmin('admin-deposit', { userId: depositUserId, amount: Number(depositAmount), note: depositNote });
    setDepositUserId(''); setDepositAmount(''); setDepositNote('');
  };

  const lookupOwner = async (username) => {
    if (!username.trim()) return;
    try {
      const data = await apiFetch(`/api/app?action=lookup-user&username=${encodeURIComponent(username)}`);
      setLookupResults(data.users || []);
    } catch (e) { setLookupResults([]); }
  };

  const addSite = async () => {
    if (!newSite.name) { setMessage('Name is required'); return; }
    let ownerId = newSite.owner_id;
    if (!ownerId && newSite.owner_discord) {
      try {
        const data = await apiFetch(`/api/app?action=lookup-user&username=${encodeURIComponent(newSite.owner_discord)}`);
        if (data.users?.length === 1) ownerId = data.users[0].id;
        else if (data.users?.length > 1) { setMessage('Multiple users found, select one from the dropdown'); return; }
      } catch {}
    }
    if (!ownerId && !newSite.discord_id) { setMessage('Enter Owner UUID, Discord ID, or type a Discord username'); return; }
    callAdmin('admin-add-site', { name: newSite.name, url: newSite.url, category: newSite.category, description: newSite.description, owner_id: ownerId, discord_id: newSite.discord_id || null, owner_discord: newSite.owner_discord, plot_number: newSite.plot_number, shortcut: newSite.shortcut, discord_invite: newSite.discord_invite, keywords: newSite.keywords });
    setNewSite({ name: '', url: '', category: 'Other', description: '', owner_id: '', owner_discord: '', discord_id: '', plot_number: '', shortcut: '', discord_invite: '', keywords: '' });
  };

  const deleteSite = (siteId) => {
    if (!confirm('Delete this site permanently?')) return;
    callAdmin('admin-delete-site', { siteId });
  };

  const updateStaffPermissions = async (userId, permissions) => {
    try {
      await apiFetch('/api/app?action=admin-update-staff-perms', { method: 'POST', body: JSON.stringify({ userId, permissions }) });
      setMessage('Permissions updated');
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const addStaff = async (userId) => {
    try {
      await apiFetch('/api/app?action=admin-add-staff', { method: 'POST', body: JSON.stringify({ userId }) });
      setMessage('User promoted to staff');
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const removeStaff = async (userId) => {
    try {
      await apiFetch('/api/app?action=admin-remove-staff', { method: 'POST', body: JSON.stringify({ userId }) });
      setMessage('Staff role removed');
      fetchData(activeTab);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    !searchTerm ||
    (p.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.mc_username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSites = sites.filter(s =>
    !searchTerm ||
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const filteredVerifications = verifications.filter(v => v.status === 'pending');
  const filteredAdRequests = adRequests.filter(a => a.status === 'pending');

  const TabButton = ({ id, label, badge }) => (
    <button
      onClick={() => { setActiveTab(id); setSearchTerm(''); }}
      className={`px-3 py-2 rounded-lg font-bold text-xs transition whitespace-nowrap ${
        activeTab === id ? 'bg-blue-600 text-white' : 'bg-[#303134] text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {label}
      {badge > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">{badge}</span>}
    </button>
  );

  const PERMISSIONS = [
    { id: 'manage_withdrawals', label: 'Manage Withdrawals' },
    { id: 'manage_verifications', label: 'Manage Verifications' },
    { id: 'manage_ads', label: 'Manage Ads' },
    { id: 'manage_sites', label: 'Manage Sites' },
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'manage_staff', label: 'Manage Staff' },
    { id: 'manage_businesses', label: 'Manage Businesses' }
  ];

  const hasPerm = (perm) => !userPermissions || userPermissions.length === 0 || userPermissions.includes(perm);

  if (!authorized) return <div className="min-h-screen flex items-center justify-center text-gray-400">Checking permissions...</div>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Withdrawals</p>
            <p className="text-3xl font-bold text-green-400">{stats.pendingWithdrawals || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Verifications</p>
            <p className="text-3xl font-bold text-blue-400">{stats.pendingVerifications || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Ad Requests</p>
            <p className="text-3xl font-bold text-purple-400">{stats.pendingAds || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Sites</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.totalSites || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Users</p>
            <p className="text-3xl font-bold text-cyan-400">{stats.totalUsers || 0}</p>
          </div>
        </div>

        {message && <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">{message}</div>}

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-3 overflow-x-auto">
          {hasPerm('manage_staff') && <TabButton id="overview" label="Overview" />}
          {hasPerm('manage_withdrawals') && <TabButton id="withdrawals" label="Withdrawals" badge={stats.pendingWithdrawals} />}
          {hasPerm('manage_verifications') && <TabButton id="verifications" label="Verifications" badge={stats.pendingVerifications} />}
          {hasPerm('manage_ads') && <TabButton id="ads" label="Ad Requests" badge={stats.pendingAds} />}
          {hasPerm('manage_staff') && <TabButton id="pending" label="Pending" />}
          {hasPerm('manage_staff') && <TabButton id="payouts" label="Payouts" />}
          {hasPerm('manage_sites') && <TabButton id="sites" label="Sites" />}
          {hasPerm('manage_users') && <TabButton id="users" label="Users" />}
          {hasPerm('manage_staff') && <TabButton id="transactions" label="Transactions" />}
          {hasPerm('manage_staff') && <TabButton id="staff" label="Staff" />}
          {hasPerm('manage_businesses') && <TabButton id="businesses" label="Businesses" />}
          {hasPerm('manage_staff') && <TabButton id="moderation" label="Moderation" badge={reports.length} />}
          {hasPerm('manage_staff') && <TabButton id="messages" label="Messages" />}
          {hasPerm('manage_ads') && <TabButton id="manage-ads" label="Manage Ads" />}
        </div>

        {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setActiveTab('withdrawals')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Withdrawals</button>
                <button onClick={() => setActiveTab('verifications')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Verifications</button>
                <button onClick={() => setActiveTab('ads')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Ad Requests</button>
                <button onClick={() => setActiveTab('staff')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Manage Staff</button>
              </div>
            </div>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Platform Stats</h3>
              <p className="text-gray-400 text-sm">Hosting {stats.totalSites} sites with {stats.totalUsers} users.</p>
            </div>
          </div>
        )}

        {!loading && activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {filteredWithdrawals.length === 0 ? <p className="text-center text-gray-500 py-8">No pending withdrawals</p> :
              filteredWithdrawals.map(w => (
                <div key={w.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-white font-bold">{w.mc_username || w.user_id?.slice(0, 8) || 'Unknown'}</p>
                    <p className="text-2xl font-bold text-green-400 mb-2">${parseFloat(w.amount).toFixed(2)}</p>
                    <div className="bg-gray-900 p-3 rounded text-xs">
                      <p className="text-gray-400 mb-1">Payment Command:</p>
                      <code className="text-yellow-400 font-mono block">/pay {w.mc_username || 'Unknown'} {parseFloat(w.amount).toFixed(2)}</code>
                    </div>
                  </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleWithdrawal(w.id, 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">Approve</button>
                      <button onClick={() => handleWithdrawal(w.id, 'reject')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Reject</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {!loading && activeTab === 'verifications' && (
          <div className="space-y-3">
            {filteredVerifications.length === 0 ? <p className="text-center text-gray-500 py-8">No pending verifications</p> :
              filteredVerifications.map(v => (
                <div key={v.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-white font-bold">{v.site_name || v.sites?.name}</p>
                      <p className="text-blue-400 text-sm">{v.site_url}</p>
                      <p className="text-gray-400 text-sm">Owner: {v.profiles?.username}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleApproveVerification(v)} disabled={!v.site_id} className="px-4 py-2 bg-green-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-bold">Verify</button>
                      <button onClick={async () => { await supabase.from('site_verification_requests').update({ status: 'rejected' }).eq('id', v.id); fetchData(activeTab); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Reject</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {!loading && activeTab === 'ads' && (
          <div className="space-y-3">
            {filteredAdRequests.length === 0 ? <p className="text-center text-gray-500 py-8">No pending ad requests</p> :
              filteredAdRequests.map(req => (
                <div key={req.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-white font-bold">{req.sites?.name}</p>
                      <p className="text-gray-400 text-sm">By: {req.profiles?.username}</p>
                      <div className="mt-2 flex gap-2 items-center">
                        <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs capitalize">{req.tier}</span>
                        <span className="text-green-400 font-bold">${req.price}</span>
                      </div>
                      {req.image_url && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-xs mb-1">Ad Image:</p>
                          <img src={req.image_url.replace(/^https?:\/\/i\.imgur\.com\//, 'https://wsrv.nl/?url=https://i.imgur.com/')} alt="Ad" className="max-w-xs rounded border border-gray-700" onError={(e) => { e.currentTarget.onerror = null; if (e.currentTarget.src !== req.image_url) e.currentTarget.src = req.image_url; }} />
                        </div>
                      )}
                      {req.description && <p className="text-gray-300 text-sm mt-2">{req.description}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleAdRequest(req, 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">Approve</button>
                      <button onClick={() => handleAdRequest(req, 'reject')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Reject</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {!loading && activeTab === 'pending' && (
          <div>
            <h3 className="text-lg font-bold text-yellow-400 mb-3">Pending Approval ({pendingSites.length})</h3>
            {pendingSites.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No pending items. Users can submit via /submit-site.</p>
            ) : (
              <div className="space-y-3">
                {pendingSites.map(item => (
                  <div key={item.id} className="bg-[#303134] border border-yellow-700 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold text-lg">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.url} &middot; {item.owner_name || 'Unknown'}</p>
                      {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => callAdmin('admin-approve-site', { siteId: item.id })} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Approve</button>
                      <button onClick={() => callAdmin('admin-reject-site', { siteId: item.id })} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'sites' && (
          <div>
            <div className="mb-4 bg-[#303134] border border-green-700 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 text-lg">Add New Site</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Site Name *" value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="text" placeholder="Owner User ID (UUID) - type username above to auto-fill" value={newSite.owner_id} onChange={(e) => setNewSite({...newSite, owner_id: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <div className="relative">
                  <input type="text" placeholder="Owner Discord Username" value={newSite.owner_discord} onChange={(e) => { setNewSite({...newSite, owner_discord: e.target.value}); if (e.target.value.length > 2) lookupOwner(e.target.value); }} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white w-full" />
                  {lookupResults.length > 0 && <div className="absolute z-10 top-full left-0 right-0 bg-[#202124] border border-gray-700 rounded mt-1 max-h-32 overflow-y-auto">{lookupResults.map(u => <button key={u.id} type="button" onClick={() => { setNewSite({...newSite, owner_id: u.id, owner_discord: u.username}); setLookupResults([]); }} className="w-full text-left px-3 py-2 text-white text-sm hover:bg-gray-700 border-b border-gray-700 last:border-0">{u.username} {u.mc_username && `(MC: ${u.mc_username})`}</button>)}</div>}
                </div>
                <input type="text" placeholder="Or Discord ID (for users not signed up yet)" value={newSite.discord_id} onChange={(e) => setNewSite({...newSite, discord_id: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <select value={newSite.category} onChange={(e) => setNewSite({...newSite, category: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white">
                  {['Retail Shop','Restaurant / Food','Real Estate','Bank / Finance','Legal Services','Service (Building, Mining, etc)','Farm / Agriculture','Entertainment / Casino','Government / Public Service','Technology / Redstone','Transportation','Hotel / Accommodation','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="url" placeholder="Website URL" value={newSite.url} onChange={(e) => setNewSite({...newSite, url: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="text" placeholder="Plot Number" value={newSite.plot_number} onChange={(e) => setNewSite({...newSite, plot_number: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="text" placeholder="Search Shortcut" value={newSite.shortcut} onChange={(e) => setNewSite({...newSite, shortcut: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="url" placeholder="Discord Invite Link" value={newSite.discord_invite} onChange={(e) => setNewSite({...newSite, discord_invite: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="text" placeholder="Keywords (comma separated)" value={newSite.keywords} onChange={(e) => setNewSite({...newSite, keywords: e.target.value})} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <textarea placeholder="Description" value={newSite.description} onChange={(e) => setNewSite({...newSite, description: e.target.value})} className="md:col-span-2 px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" rows={3} />
                <button onClick={addSite} className="md:col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold">Create Site</button>
              </div>
            </div>

            <input type="text" placeholder="Search sites..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 mb-4 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#202124]">
                  <tr>
                    <th className="text-left p-3 text-gray-400">Name</th>
                    <th className="text-left p-3 text-gray-400">Owner</th>
                    <th className="text-left p-3 text-gray-400">Category</th>
                    <th className="text-left p-3 text-gray-400">Status</th>
                    <th className="text-left p-3 text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map(site => (
                    editingSite === site.id ? (
                      <tr key={site.id} className="border-t border-gray-700 bg-gray-800/50">
                        <td className="p-3" colSpan={5}>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm" placeholder="Name" />
                            <input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm" placeholder="URL" />
                            <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm">
                              {['Retail Shop','Restaurant / Food','Real Estate','Bank / Finance','Legal Services','Service (Building, Mining, etc)','Farm / Agriculture','Entertainment / Casino','Government / Public Service','Technology / Redstone','Transportation','Hotel / Accommodation','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input value={editForm.shortcut} onChange={e => setEditForm({...editForm, shortcut: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm" placeholder="Shortcut" />
                            <input value={editForm.plot_number} onChange={e => setEditForm({...editForm, plot_number: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm" placeholder="Plot" />
                            <input value={editForm.discord_invite} onChange={e => setEditForm({...editForm, discord_invite: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm" placeholder="Discord invite" />
                            <input value={editForm.keywords} onChange={e => setEditForm({...editForm, keywords: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm col-span-2" placeholder="Keywords (comma separated)" />
                            <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-sm col-span-2" placeholder="Description" rows={2} />
                            <div className="col-span-2 flex gap-2">
                              <button onClick={() => saveEditSite(site.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded font-bold">Save</button>
                              <button onClick={() => setEditingSite(null)} className="px-3 py-1 bg-gray-600 text-white text-xs rounded">Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={site.id} className="border-t border-gray-700">
                        <td className="p-3"><p className="text-white">{site.name}</p><p className="text-xs text-gray-500">{site.url}</p></td>
                        <td className="p-3 text-gray-300">{site.owner_name || '-'}</td>
                        <td className="p-3 capitalize text-gray-300">{site.category}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${site.status === 'pending' ? 'bg-yellow-600 text-white' : site.status === 'rejected' ? 'bg-red-600 text-white' : site.is_verified ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {site.status === 'pending' ? 'Pending' : site.status === 'rejected' ? 'Rejected' : site.is_verified ? 'Verified' : 'Active'}
                          </span>
                          <button onClick={() => toggleVerified(site.id, site.is_verified)} className="ml-2 px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">Toggle V</button>
                        </td>
                        <td className="p-3 flex gap-1">
                          <button onClick={() => startEditSite(site)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Edit</button>
                          <button onClick={() => deleteSite(site.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Delete</button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div>
            <div className="mb-4 bg-[#303134] border border-green-700 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 text-lg">Manual Deposit</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="User ID" value={depositUserId} onChange={(e) => setDepositUserId(e.target.value)} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="number" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <input type="text" placeholder="Note (optional)" value={depositNote} onChange={(e) => setDepositNote(e.target.value)} className="px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
                <button onClick={manualDeposit} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold">Deposit</button>
              </div>
            </div>

            <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 mb-4 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            <div className="space-y-2">
              {filteredProfiles.map(p => (
                <div key={p.id} className="bg-[#303134] border border-gray-700 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{p.username || 'No username'}</p>
                    <p className="text-xs text-gray-500 truncate font-mono">{p.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/profile/${p.id}`)} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg">View</button>
                    <button onClick={() => { setDepositUserId(p.id); setDepositAmount(''); setDepositNote(''); window.scrollTo(0, 0); }} className="text-xs px-3 py-2 bg-green-600 text-white rounded-lg">Deposit</button>
                    {!p.is_staff && <button onClick={() => addStaff(p.id)} className="text-xs px-3 py-2 bg-yellow-600 text-white rounded-lg">Make Staff</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'transactions' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#202124]">
                <tr>
                  <th className="text-left p-3 text-gray-400">Type</th>
                  <th className="text-left p-3 text-gray-400">User</th>
                  <th className="text-left p-3 text-gray-400">Amount</th>
                  <th className="text-left p-3 text-gray-400">Note</th>
                  <th className="text-left p-3 text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.txn_id} className="border-t border-gray-700">
                    <td className="p-3 capitalize text-gray-300">{txn.type}</td>
                    <td className="p-3 text-gray-300">{txn.profiles?.username || '-'}</td>
                    <td className={`p-3 ${txn.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>${txn.amount}</td>
                    <td className="p-3 text-gray-500 text-xs">{txn.note}</td>
                    <td className="p-3 text-gray-500 text-xs">{new Date(txn.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'staff' && (
          <div>
            <div className="mb-6 bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Add Staff Member</h3>
              <input type="text" placeholder="Search user by username or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 mb-3 bg-[#202124] border border-gray-700 rounded-lg text-white" />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {profiles.filter(p => !p.is_staff && (!searchTerm || (p.username || '').toLowerCase().includes(searchTerm.toLowerCase()) || p.id.includes(searchTerm))).slice(0, 10).map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-[#202124] p-3 rounded">
                    <div>
                      <p className="text-white text-sm">{p.username || 'No username'}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.id}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => addStaff(p.id)} className="px-3 py-1 bg-green-600 text-white text-xs rounded">Full Staff</button>
                      <button onClick={async () => { await apiFetch('/api/app?action=admin-add-staff', { method: 'POST', body: JSON.stringify({ userId: p.id }) }); await updateStaffPermissions(p.id, ['manage_ads']); }} className="px-3 py-1 bg-purple-600 text-white text-xs rounded">Ad Manager</button>
                      <button onClick={async () => { await apiFetch('/api/app?action=admin-add-staff', { method: 'POST', body: JSON.stringify({ userId: p.id }) }); await updateStaffPermissions(p.id, ['manage_verifications', 'manage_businesses']); }} className="px-3 py-1 bg-yellow-600 text-white text-xs rounded">Trust & Safety</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Current Staff ({staff.length})</h3>
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-bold text-lg">{s.username || 'No username'}</p>
                      <p className="text-xs text-gray-500 font-mono">{s.id}</p>
                    </div>
                    <button onClick={() => removeStaff(s.id)} className="px-3 py-2 bg-red-600 text-white text-sm rounded">Remove Staff</button>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 text-sm mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {PERMISSIONS.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 bg-[#202124] px-3 py-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(s.staff_permissions || []).includes(perm.id)}
                            onChange={async (e) => {
                              const current = s.staff_permissions || [];
                              const updated = e.target.checked ? [...current, perm.id] : current.filter(p => p !== perm.id);
                              await updateStaffPermissions(s.id, updated);
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {staff.length === 0 && <p className="text-center text-gray-500 py-8">No staff members yet</p>}
            </div>
          </div>
        )}

        {!loading && activeTab === 'businesses' && (
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Business Registrations ({businessRegistrations.length})</h3>
            {businessRegistrations.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No business registrations yet.</p>
            ) : (
              <div className="space-y-3">
                {businessRegistrations.map(b => (
                  <div key={b.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-white font-bold text-lg">{b.business_name}</p>
                        <p className="text-sm text-gray-400">{b.category} &middot; {b.plot_number ? `Plot #${b.plot_number}` : 'No plot'}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: <span className={b.status === 'pending' ? 'text-yellow-400' : b.status === 'approved' ? 'text-green-400' : 'text-red-400'}>{b.status}</span></p>
                        {b.description && <p className="text-xs text-gray-500 mt-1">{b.description}</p>}
                        {b.owner_discord && <p className="text-xs text-gray-500 mt-1">Discord: {b.owner_discord}</p>}
                        {b.website_url && <p className="text-xs text-gray-500 mt-1">URL: {b.website_url}</p>}
                      </div>
                      {b.status === 'pending' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={async () => { try { await apiFetch('/api/app?action=approve-business', { method: 'POST', body: JSON.stringify({ id: b.id }) }); await supabase.from('staff_actions').insert({ staff_id: user.id, action_type: 'free_site', reference_id: b.id?.toString(), description: `Approved free site "${b.business_name}" (${b.category}) — $40 commission`, amount: 40 }); } catch (e) { setMessage('Error: ' + e.message); } fetchData(activeTab); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">Approve</button>
                          <button onClick={async () => { await supabase.from('business_registrations').update({ status: 'rejected' }).eq('id', b.id); fetchData(activeTab); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'messages' && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages yet</p>
            ) : messages.map(m => (
              <div key={m.id} className={`bg-[#303134] border rounded-xl p-4 ${m.is_read ? 'border-gray-700' : 'border-yellow-500/50'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{m.name}</p>
                      {!m.is_read && <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">New</span>}
                    </div>
                    <p className="text-sm text-gray-300 font-medium mt-1">{m.subject}</p>
                    <p className="text-sm text-gray-400 mt-1">{m.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                    {m.user_id && <p className="text-xs text-gray-600 mt-1">User ID: {m.user_id}</p>}
                  </div>
                  {!m.is_read && (
                    <button onClick={async () => { await supabase.from('contact_messages').update({ is_read: true }).eq('id', m.id); setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x)); }} className="px-3 py-1 bg-blue-600 text-white text-xs rounded whitespace-nowrap">Mark Read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

          {!loading && activeTab === 'manage-ads' && (
          <div className="space-y-6">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-bold mb-4">Add Ad to Site</h3>
              <div className="flex flex-wrap gap-2 items-end">
                <select id="ad-site-select" className="flex-1 min-w-[200px] px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white text-sm">
                  <option value="">Select site...</option>
                  {Array.isArray(managedAds?.sites) && managedAds.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select id="ad-tier-select" className="px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white text-sm">
                  <option value="standard">Standard ($110)</option>
                  <option value="featured">Featured ($160)</option>
                  <option value="premium">Premium ($400)</option>
                  <option value="elite">Elite ($600)</option>
                </select>
                <ImageUpload bucket="ad-images" path="admin" onUpload={(url) => setAdImageUrl(url)} label="Upload Ad Image" />
                <button onClick={async () => {
                  const siteId = document.getElementById('ad-site-select').value;
                  const tier = document.getElementById('ad-tier-select').value;
                  if (!siteId) return setMessage('Select a site');
                  const site = managedAds.sites.find(s => s.id === siteId);
                  await supabase.from('ads').insert({ title: site.name, link_url: `/site/${site.slug}`, tier, is_active: true, description: '', image_url: adImageUrl || '' });
                  await supabase.from('sites').update({ ad_tier: tier, ad_expires_at: getAdExpiry(tier, {}) }).eq('id', siteId);
                  setAdImageUrl('');
                  setMessage('Ad added to site');
                  fetchData(activeTab);
                }} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Add</button>
                {adImageUrl && <img src={adImageUrl} alt="" className="w-12 h-12 rounded object-cover border border-gray-700" />}
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-3">Active Ads ({Array.isArray(managedAds?.ads) ? managedAds.ads.filter(a => a.is_active).length : 0})</h3>
              {(!managedAds?.ads || managedAds.ads.length === 0) ? (
                <p className="text-gray-500">No ads</p>
              ) : managedAds.ads.filter(a => a.is_active).map(ad => (
                <div key={ad.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-4">
                    {ad.image_url && <img src={ad.image_url} alt="" className="w-16 h-16 rounded object-cover border border-gray-700" onError={(e) => { e.target.style.display = 'none' }} />}
                    <div className="flex-1">
                      <p className="text-white font-bold">{ad.title}</p>
                      <p className="text-sm text-gray-400">{ad.tier} — {ad.link_url}</p>
                    </div>
                    <div className="flex gap-2">
                      {editingAdImage === ad.id ? (
                        <>
                          <ImageUpload bucket="ad-images" path={`ad-${ad.id}`} onUpload={async (url) => {
                            await supabase.from('ads').update({ image_url: url }).eq('id', ad.id);
                            setEditingAdImage(null);
                            fetchData(activeTab);
                          }} label="Upload" />
                          <button onClick={() => setEditingAdImage(null)} className="px-2 py-1 bg-gray-600 text-white text-xs rounded">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingAdImage(ad.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded">Change Image</button>
                          <button onClick={async () => {
                            try {
                              await apiFetch('/api/app?action=revoke-ad', { method: 'POST', body: JSON.stringify({ adId: ad.id }) });
                              setMessage('Ad revoked');
                              fetchData(activeTab);
                            } catch (e) { setMessage('Revoke failed: ' + e.message); }
                          }} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Revoke</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-white font-bold mb-3">Sites with Ads</h3>
              {(!managedAds?.sites || managedAds.sites.length === 0) ? <p className="text-gray-500">No sites</p> : 
                managedAds.sites.filter(s => s.ad_tier).map(s => (
                  <div key={s.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4 mb-2 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{s.name}</p>
                      <p className="text-sm text-gray-400">{s.ad_tier} — expires {s.ad_expires_at ? new Date(s.ad_expires_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button onClick={async () => {
                      try {
                        await apiFetch('/api/app?action=revoke-site-ad', { method: 'POST', body: JSON.stringify({ siteId: s.id }) });
                        setMessage('Ad removed from site');
                        fetchData(activeTab);
                      } catch (e) { setMessage('Remove failed: ' + e.message); }
                    }} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Remove</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {!loading && activeTab === 'payouts' && (
          <div>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Staff Payouts Summary</h3>
              {staffActions.length === 0 ? (
                <p className="text-gray-500">No actions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#202124]">
                      <tr>
                        <th className="text-left p-3 text-gray-400">Staff Member</th>
                        <th className="text-left p-3 text-gray-400">Ad Commissions</th>
                        <th className="text-left p-3 text-gray-400">Free Sites</th>
                        <th className="text-left p-3 text-gray-400">Verifications</th>
                        <th className="text-left p-3 text-gray-400">Total Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        staffActions.reduce((acc, a) => {
                          acc[a.staff_id] = acc[a.staff_id] || { ad: 0, free: 0, verify: 0 };
                          if (a.action_type === 'ad_commission') acc[a.staff_id].ad += a.amount;
                          else if (a.action_type === 'free_site') acc[a.staff_id].free += a.amount;
                          else if (a.action_type === 'site_verify') acc[a.staff_id].verify += a.amount;
                          return acc;
                        }, {})
                      ).map(([staffId, totals]) => (
                        <tr key={staffId} className="border-t border-gray-700">
                          <td className="p-3 text-white font-bold">{profilesMap[staffId] || staffId.slice(0, 8)}</td>
                          <td className="p-3 text-green-400">${totals.ad.toFixed(2)}</td>
                          <td className="p-3 text-purple-400">${totals.free.toFixed(2)}</td>
                          <td className="p-3 text-blue-400">${totals.verify.toFixed(2)}</td>
                          <td className="p-3 text-yellow-400 font-bold">${(totals.ad + totals.free + totals.verify).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-4">Recent Actions</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {staffActions.slice(0, 50).map(a => (
                  <div key={a.id} className="bg-[#202124] p-3 rounded flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm font-medium">{profilesMap[a.staff_id] || a.staff_id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">{a.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">${a.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {staffActions.length === 0 && <p className="text-gray-500 text-center py-4">No actions yet</p>}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'moderation' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reports to review</p>
            ) : reports.map(r => (
              <div key={r.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-white font-bold">{r.sites?.name || 'Unknown Site'}</p>
                    <p className="text-sm text-gray-400 mt-1">Reported by: {r.profiles?.username || 'Unknown'}</p>
                    {r.reason && <p className="text-sm text-yellow-400 mt-1">Reason: {r.reason}</p>}
                    <p className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a href={`/site/${r.sites?.slug}`} target="_blank" className="px-3 py-1 bg-blue-600 text-white text-xs rounded text-center">View Site</a>
                    <button onClick={() => handleModAction(r, 'remove')} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Remove Site</button>
                    <button onClick={() => handleModAction(r, 'dismiss')} className="px-3 py-1 bg-gray-600 text-white text-xs rounded">Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
