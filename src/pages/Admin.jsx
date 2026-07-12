import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data: wdCount } = await supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: vfCount } = await supabase.from('site_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: adCount } = await supabase.from('ad_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      const { data: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStats({
        pendingWithdrawals: wdCount?.length || 0,
        pendingVerifications: vfCount?.length || 0,
        pendingAds: adCount?.length || 0,
        totalSites: siteCount?.length || 0,
        totalUsers: userCount?.length || 0
      });

      if (activeTab === 'withdrawals') {
        const { data } = await supabase.from('withdrawal_requests').select('*, profiles(mc_username, username, id)').order('created_at', { ascending: false });
        setWithdrawals(data || []);
      } else if (activeTab === 'verifications') {
        const { data } = await supabase.from('site_verification_requests').select('*, profiles(username), sites(name, id, user_id)').order('created_at', { ascending: false });
        setVerifications(data || []);
      } else if (activeTab === 'ads') {
        const { data } = await supabase.from('ad_requests').select('*, profiles(username), sites(name)').order('created_at', { ascending: false });
        setAdRequests(data || []);
      } else if (activeTab === 'sites') {
        const { data } = await supabase.from('sites').select('*, profiles(username)').order('created_at', { ascending: false });
        setSites(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setProfiles(data || []);
      } else if (activeTab === 'transactions') {
        const { data } = await supabase.from('transactions').select('*, profiles(username)').order('created_at', { ascending: false }).limit(100);
        setTransactions(data || []);
      } else if (activeTab === 'staff') {
        const { data } = await supabase.from('profiles').select('*').eq('is_staff', true);
        setStaff(data || []);
      } else if (activeTab === 'moderation') {
        const { data } = await supabase.from('site_reports').select('*, profiles(username), sites(name, slug)').order('created_at', { ascending: false }).limit(50);
        setReports(data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleWithdrawal = async (id, action) => {
    try {
      const res = await fetch('/api/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-withdrawal', withdrawalId: id, actionType: action })
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleApproveVerification = async (req) => {
    try {
      await supabase.from('site_verification_requests').update({ status: 'approved' }).eq('id', req.id);
      if (req.site_id) {
        await supabase.from('sites').update({ is_verified: true, verification_paid_at: new Date().toISOString() }).eq('id', req.site_id);
      }
      setMessage('Verification approved');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleAdRequest = async (req, action) => {
    try {
      if (action === 'approve') {
        await supabase.from('ad_requests').update({ status: 'approved' }).eq('id', req.id);
        await supabase.from('sites').update({ 
          ad_tier: req.tier, 
          ad_price: req.price,
          image_url: req.image_url,
          ad_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }).eq('id', req.site_id);
        setMessage('Ad approved and activated');
      } else {
        await supabase.from('ad_requests').update({ status: 'rejected' }).eq('id', req.id);
        setMessage('Ad rejected');
      }
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const toggleVerified = async (siteId, currentVal) => {
    try {
      await supabase.from('sites').update({ is_verified: !currentVal }).eq('id', siteId);
      setMessage(!currentVal ? 'Site verified' : 'Verification removed');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const deleteSite = async (siteId) => {
    if (!confirm('Delete this site permanently?')) return;
    try {
      await supabase.from('sites').delete().eq('id', siteId);
      setMessage('Site deleted');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const updateStaffPermissions = async (userId, permissions) => {
    try {
      await supabase.from('profiles').update({ staff_permissions: permissions }).eq('id', userId);
      setMessage('Permissions updated');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const addStaff = async (userId) => {
    try {
      await supabase.from('profiles').update({ is_staff: true, staff_permissions: [] }).eq('id', userId);
      setMessage('User promoted to staff');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const removeStaff = async (userId) => {
    try {
      await supabase.from('profiles').update({ is_staff: false, staff_permissions: null }).eq('id', userId);
      setMessage('Staff role removed');
      fetchData();
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
    { id: 'manage_staff', label: 'Manage Staff' }
  ];

  return (
    <Layout>
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
          <TabButton id="overview" label="Overview" />
          <TabButton id="withdrawals" label="Withdrawals" badge={stats.pendingWithdrawals} />
          <TabButton id="verifications" label="Verifications" badge={stats.pendingVerifications} />
          <TabButton id="ads" label="Ad Requests" badge={stats.pendingAds} />
          <TabButton id="sites" label="Sites" />
          <TabButton id="users" label="Users" />
          <TabButton id="transactions" label="Transactions" />
          <TabButton id="staff" label="Staff" />
          <TabButton id="moderation" label="Moderation" badge={reports.length} />
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
                      <p className="text-white font-bold">{w.profiles?.username || 'Unknown'}</p>
                      <p className="text-2xl font-bold text-green-400 mb-2">${w.amount}</p>
                      {w.profiles?.mc_username && (
                        <div className="bg-gray-900 p-3 rounded text-xs">
                          <p className="text-gray-400 mb-1">Payment Command:</p>
                          <code className="text-yellow-400 font-mono block">/pay {w.profiles.mc_username} {w.amount}</code>
                        </div>
                      )}
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
                      <button onClick={async () => { await supabase.from('site_verification_requests').update({ status: 'rejected' }).eq('id', v.id); fetchData(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Reject</button>
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
                          <img src={req.image_url} alt="Ad" className="max-w-xs rounded border border-gray-700" />
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

        {!loading && activeTab === 'sites' && (
          <div>
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
                    <tr key={site.id} className="border-t border-gray-700">
                      <td className="p-3"><p className="text-white">{site.name}</p><p className="text-xs text-gray-500">{site.url}</p></td>
                      <td className="p-3 text-gray-300">{site.owner_name || site.profiles?.username || '-'}</td>
                      <td className="p-3 capitalize text-gray-300">{site.category}</td>
                      <td className="p-3">
                        <button onClick={() => toggleVerified(site.id, site.is_verified)} className={`px-2 py-1 text-xs rounded ${site.is_verified ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                          {site.is_verified ? 'Verified' : 'Not Verified'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => deleteSite(site.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div>
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
                    {!p.is_staff && <button onClick={() => addStaff(p.id)} className="text-xs px-3 py-2 bg-green-600 text-white rounded-lg">Make Staff</button>}
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
                    <button onClick={() => addStaff(p.id)} className="px-3 py-1 bg-green-600 text-white text-xs rounded">Add as Staff</button>
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
                    <button onClick={async () => { await supabase.from('site_reports').delete().eq('id', r.id); await supabase.from('sites').update({ is_verified: false, is_active: false }).eq('id', r.site_id); fetchData(); }} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Remove Site</button>
                    <button onClick={async () => { await supabase.from('site_reports').update({ status: 'dismissed' }).eq('id', r.id); fetchData(); }} className="px-3 py-1 bg-gray-600 text-white text-xs rounded">Dismiss</button>
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
