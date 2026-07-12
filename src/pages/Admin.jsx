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
  const [ads, setAds] = useState([]);
  const [sites, setSites] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data: wdCount } = await supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: vfCount } = await supabase.from('site_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      const { data: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStats({
        pendingWithdrawals: wdCount?.length || 0,
        pendingVerifications: vfCount?.length || 0,
        totalSites: siteCount?.length || 0,
        totalUsers: userCount?.length || 0
      });

      if (activeTab === 'overview') {
        // nothing
      } else if (activeTab === 'withdrawals') {
        const { data } = await supabase.from('withdrawal_requests').select('*, profiles(mc_username, username, id)').order('created_at', { ascending: false });
        setWithdrawals(data || []);
      } else if (activeTab === 'verifications') {
        const { data } = await supabase.from('site_verification_requests').select('*, profiles(username), sites(name, id, user_id)').order('created_at', { ascending: false });
        setVerifications(data || []);
      } else if (activeTab === 'ads') {
        const { data } = await supabase.from('sites').select('*, profiles(username)').not('ad_tier', 'is', null).order('created_at', { ascending: false });
        setAds(data || []);
      } else if (activeTab === 'sites') {
        const { data } = await supabase.from('sites').select('*, profiles(username)').order('created_at', { ascending: false });
        setSites(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setProfiles(data || []);
      } else if (activeTab === 'transactions') {
        const { data } = await supabase.from('transactions').select('*, profiles(username)').order('created_at', { ascending: false }).limit(50);
        setTransactions(data || []);
      } else if (activeTab === 'departments') {
        const { data } = await supabase.from('departments').select('*').order('name');
        setDepartments(data || []);
      } else if (activeTab === 'staff') {
        const { data } = await supabase.from('profiles').select('*').eq('is_staff', true);
        setStaff(data || []);
      } else if (activeTab === 'settings') {
        const { data } = await supabase.from('settings').select('*').single();
        setSettings(data || {});
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleWithdrawal = async (id, action, mcUsername, amount, userId) => {
    try {
      const res = await fetch('/api/approve-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action })
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
        await supabase.from('sites').update({
          is_verified: true,
          verification_paid_at: new Date().toISOString()
        }).eq('id', req.site_id);
      }
      setMessage('Verification approved');
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

  const filteredProfiles = profiles.filter(p =>
    !searchTerm ||
    (p.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.mc_username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSites = sites.filter(s =>
    !searchTerm ||
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const filteredVerifications = verifications.filter(v => v.status === 'pending');

  const TabButton = ({ id, label, badge }) => (
    <button
      onClick={() => { setActiveTab(id); setSearchTerm(''); }}
      className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
        activeTab === id
          ? 'bg-blue-600 text-white'
          : 'bg-[#303134] text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">{badge}</span>
      )}
    </button>
  );

  return (
    <Layout>
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Pending Withdrawals</p>
            <p className="text-3xl font-bold text-green-400">{stats.pendingWithdrawals || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Pending Verifications</p>
            <p className="text-3xl font-bold text-blue-400">{stats.pendingVerifications || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Sites</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.totalSites || 0}</p>
          </div>
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-purple-400">{stats.totalUsers || 0}</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-3 overflow-x-auto">
          <TabButton id="overview" label="Overview" />
          <TabButton id="withdrawals" label="Withdrawals" badge={stats.pendingWithdrawals} />
          <TabButton id="verifications" label="Verifications" badge={stats.pendingVerifications} />
          <TabButton id="ads" label="Ads" />
          <TabButton id="sites" label="Sites" />
          <TabButton id="users" label="Users" />
          <TabButton id="transactions" label="Transactions" />
          <TabButton id="departments" label="Departments" />
          <TabButton id="staff" label="Staff" />
          <TabButton id="settings" label="Settings" />
          <TabButton id="analytics" label="Analytics" />
          <TabButton id="logs" label="Logs" />
          <TabButton id="backup" label="Backup" />
          <TabButton id="tools" label="Tools" />
        </div>

        {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

        {/* OVERVIEW TAB */}
        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setActiveTab('withdrawals')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Withdrawal Requests</button>
                <button onClick={() => setActiveTab('verifications')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Verification Requests</button>
                <button onClick={() => setActiveTab('ads')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Manage Active Ads</button>
                <button onClick={() => setActiveTab('users')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Manage User Profiles</button>
              </div>
            </div>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Platform Stats</h3>
              <p className="text-gray-400 text-sm">The directory currently hosts {stats.totalSites || 0} sites with {stats.totalUsers || 0} registered users.</p>
            </div>
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {!loading && activeTab === 'withdrawals' && (
          <div>
            {filteredWithdrawals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending withdrawal requests</p>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map(w => (
                  <div key={w.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-white font-bold">{w.profiles?.username || 'Unknown'}</p>
                          <span className="text-xs text-gray-500 font-mono">({w.user_id?.slice(0, 8)})</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400 mb-2">${w.amount}</p>
                        {w.profiles?.mc_username && (
                          <div className="bg-gray-900 p-3 rounded text-xs">
                            <p className="text-gray-400 mb-1">Payment Command:</p>
                            <code className="text-yellow-400 font-mono block">/pay {w.profiles.mc_username} {w.amount}</code>
                          </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">{new Date(w.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleWithdrawal(w.id, 'approve', w.profiles?.mc_username, w.amount, w.user_id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">Approve & Deduct</button>
                        <button onClick={() => handleWithdrawal(w.id, 'reject')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERIFICATIONS TAB */}
        {!loading && activeTab === 'verifications' && (
          <div>
            {filteredVerifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending verification requests</p>
            ) : (
              <div className="space-y-3">
                {filteredVerifications.map(v => (
                  <div key={v.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-white font-bold">{v.site_name || v.sites?.name}</p>
                          {v.sites?.is_verified && <span className="text-blue-400 text-xs">Already Verified</span>}
                        </div>
                        <p className="text-blue-400 text-sm mb-2 break-all">{v.site_url}</p>
                        <p className="text-gray-400 text-sm">Owner: {v.profiles?.username}</p>
                        {v.description && <p className="text-gray-500 text-xs mt-2">{v.description}</p>}
                        <p className="text-gray-600 text-xs mt-2">{new Date(v.created_at).toLocaleString()} - $100 fee</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleApproveVerification(v)} disabled={!v.site_id} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold">Verify</button>
                        <button onClick={async () => { await supabase.from('site_verification_requests').update({ status: 'rejected' }).eq('id', v.id); setMessage('Rejected'); fetchData(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADS TAB */}
        {!loading && activeTab === 'ads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ads.map(site => (
              <div key={site.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white font-bold text-sm truncate flex-1">{site.name}</p>
                  {site.is_verified && <span className="text-blue-400 text-xs ml-1">✓</span>}
                </div>
                <p className="text-gray-500 text-xs truncate">{site.profiles?.username || site.owner_name}</p>
                <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center text-xs">
                  <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded capitalize">{site.ad_tier || 'standard'}</span>
                  <span className="text-green-400 font-bold">${site.ad_price || 0}</span>
                </div>
              </div>
            ))}
            {ads.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">No ads</p>}
          </div>
        )}

        {/* SITES TAB */}
        {!loading && activeTab === 'sites' && (
          <div>
            <div className="mb-4">
              <input type="text" placeholder="Search sites by name or owner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            </div>
            <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#202124]">
                  <tr>
                    <th className="text-left p-3 text-gray-400">Site Name</th>
                    <th className="text-left p-3 text-gray-400">Owner</th>
                    <th className="text-left p-3 text-gray-400">Category</th>
                    <th className="text-left p-3 text-gray-400">Status</th>
                    <th className="text-left p-3 text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map(site => (
                    <tr key={site.id} className="border-t border-gray-700 hover:bg-gray-800">
                      <td className="p-3">
                        <p className="text-white">{site.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{site.url}</p>
                      </td>
                      <td className="p-3 text-gray-300">{site.owner_name || site.profiles?.username || '-'}</td>
                      <td className="p-3 capitalize text-gray-300">{site.category}</td>
                      <td className="p-3">
                        <button onClick={() => toggleVerified(site.id, site.is_verified)} className={`px-2 py-1 text-xs rounded ${site.is_verified ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                          {site.is_verified ? 'Verified' : 'Not Verified'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => deleteSite(site.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {!loading && activeTab === 'users' && (
          <div>
            <div className="mb-4">
              <input type="text" placeholder="Search users by username, MC, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            </div>
            <div className="space-y-2">
              {filteredProfiles.map(p => (
                <div key={p.id} className="bg-[#303134] border border-gray-700 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{p.username || 'No username'}</p>
                    <p className="text-xs text-gray-500 truncate font-mono">{p.id}</p>
                    {p.mc_username && <p className="text-xs text-gray-400 mt-1">MC: {p.mc_username} {p.mc_verified ? '✓' : ''}</p>}
                  </div>
                  <button onClick={() => navigate(`/profile/${p.id}`)} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Profile</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {!loading && activeTab === 'transactions' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#202124]">
                <tr>
                  <th className="text-left p-3 text-gray-400">Type</th>
                  <th className="text-left p-3 text-gray-400">User</th>
                  <th className="text-left p-3 text-gray-400">Amount</th>
                  <th className="text-left p-3 text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.txn_id} className="border-t border-gray-700">
                    <td className="p-3 capitalize text-gray-300">{txn.type}</td>
                    <td className="p-3 text-gray-300">{txn.profiles?.username || '-'}</td>
                    <td className="p-3 text-green-400">${txn.amount}</td>
                    <td className="p-3 text-gray-500 text-xs">{new Date(txn.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DEPARTMENTS TAB */}
        {!loading && activeTab === 'departments' && (
          <div className="space-y-3">
            {departments.map(dept => (
              <div key={dept.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <p className="text-white font-bold">{dept.name}</p>
                <p className="text-gray-400 text-sm">{dept.description}</p>
              </div>
            ))}
            {departments.length === 0 && <p className="text-center text-gray-500 py-8">No departments</p>}
          </div>
        )}

        {/* STAFF TAB */}
        {!loading && activeTab === 'staff' && (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="bg-[#303134] border border-gray-700 rounded-xl p-3">
                <p className="text-white font-bold">{s.username}</p>
                <p className="text-gray-400 text-xs">{s.id}</p>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {!loading && activeTab === 'settings' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Platform Settings</h3>
            <p className="text-gray-400 text-sm">Configure platform-wide settings here.</p>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {!loading && activeTab === 'analytics' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Analytics</h3>
            <p className="text-gray-400 text-sm">View platform analytics and metrics.</p>
          </div>
        )}

        {/* LOGS TAB */}
        {!loading && activeTab === 'logs' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">System Logs</h3>
            <p className="text-gray-400 text-sm">View system logs and audit trails.</p>
          </div>
        )}

        {/* BACKUP TAB */}
        {!loading && activeTab === 'backup' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Backup & Restore</h3>
            <p className="text-gray-400 text-sm">Manage database backups and restores.</p>
          </div>
        )}

        {/* TOOLS TAB */}
        {!loading && activeTab === 'tools' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Admin Tools</h3>
            <p className="text-gray-400 text-sm">Additional administrative tools and utilities.</p>
          </div>
        )}
      </main>
    </Layout>
  );
}
