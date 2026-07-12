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
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [upvotes, setUpvotes] = useState([]);
  const [stats, setStats] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

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

      if (activeTab === 'withdrawals') {
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
        const { data } = await supabase.from('transactions').select('*, profiles(username)').order('created_at', { ascending: false }).limit(100);
        setTransactions(data || []);
      } else if (activeTab === 'reports') {
        const { data } = await supabase.from('site_reports').select('*, profiles(username), sites(name)').order('created_at', { ascending: false });
        setReports(data || []);
      } else if (activeTab === 'reviews') {
        const { data } = await supabase.from('site_reviews').select('*, profiles(username), sites(name)').order('created_at', { ascending: false }).limit(50);
        setReviews(data || []);
      } else if (activeTab === 'bookmarks') {
        const { data } = await supabase.from('bookmarks').select('*, profiles(username), sites(name)').order('created_at', { ascending: false }).limit(50);
        setBookmarks(data || []);
      } else if (activeTab === 'followers') {
        const { data } = await supabase.from('site_followers').select('*, profiles(username), sites(name)').order('created_at', { ascending: false }).limit(50);
        setFollowers(data || []);
      } else if (activeTab === 'upvotes') {
        const { data } = await supabase.from('site_upvotes').select('*, profiles(username), sites(name)').order('created_at', { ascending: false }).limit(50);
        setUpvotes(data || []);
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleWithdrawal = async (id, action) => {
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
        await supabase.from('sites').update({ is_verified: true, verification_paid_at: new Date().toISOString() }).eq('id', req.site_id);
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

  const updateAdTier = async (siteId, tier, price) => {
    try {
      await supabase.from('sites').update({ ad_tier: tier, ad_price: price }).eq('id', siteId);
      setMessage('Ad tier updated');
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

  const addStaff = async (userId) => {
    try {
      await supabase.from('profiles').update({ is_staff: true }).eq('id', userId);
      setMessage('User promoted to staff');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const removeStaff = async (userId) => {
    try {
      await supabase.from('profiles').update({ is_staff: false }).eq('id', userId);
      setMessage('Staff role removed');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const deleteReport = async (id) => {
    try {
      await supabase.from('site_reports').delete().eq('id', id);
      setMessage('Report dismissed');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const deleteReview = async (id) => {
    try {
      await supabase.from('site_reviews').delete().eq('id', id);
      setMessage('Review deleted');
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
      className={`px-3 py-2 rounded-lg font-bold text-xs transition whitespace-nowrap ${
        activeTab === id ? 'bg-blue-600 text-white' : 'bg-[#303134] text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {label}
      {badge > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">{badge}</span>}
    </button>
  );

  return (
    <Layout>
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

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

        {message && <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">{message}</div>}

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-3 overflow-x-auto">
          <TabButton id="overview" label="Overview" />
          <TabButton id="withdrawals" label="Withdrawals" badge={stats.pendingWithdrawals} />
          <TabButton id="verifications" label="Verifications" badge={stats.pendingVerifications} />
          <TabButton id="ads" label="Ads" />
          <TabButton id="sites" label="Sites" />
          <TabButton id="users" label="Users" />
          <TabButton id="transactions" label="Transactions" />
          <TabButton id="reports" label="Reports" />
          <TabButton id="reviews" label="Reviews" />
          <TabButton id="bookmarks" label="Bookmarks" />
          <TabButton id="followers" label="Followers" />
          <TabButton id="upvotes" label="Upvotes" />
          <TabButton id="staff" label="Staff" />
          <TabButton id="tools" label="Tools" />
        </div>

        {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setActiveTab('withdrawals')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Withdrawal Requests</button>
                <button onClick={() => setActiveTab('verifications')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Review Verification Requests</button>
                <button onClick={() => setActiveTab('reports')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">View Site Reports</button>
                <button onClick={() => setActiveTab('users')} className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200">Manage Users</button>
              </div>
            </div>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Platform Stats</h3>
              <p className="text-gray-400 text-sm">The directory currently hosts {stats.totalSites || 0} sites with {stats.totalUsers || 0} registered users.</p>
            </div>
          </div>
        )}

        {!loading && activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {filteredWithdrawals.length === 0 ? <p className="text-center text-gray-500 py-8">No pending withdrawal requests</p> :
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ads.map(site => (
              <div key={site.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <p className="text-white font-bold text-sm mb-1">{site.name}</p>
                <p className="text-gray-500 text-xs mb-2">{site.profiles?.username || site.owner_name}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded capitalize">{site.ad_tier || 'none'}</span>
                  <span className="text-green-400 font-bold">${site.ad_price || 0}</span>
                </div>
                <select value={site.ad_tier || ''} onChange={e => {
                  const prices = { standard: 110, featured: 160, premium: 400, elite: 600 };
                  updateAdTier(site.id, e.target.value, prices[e.target.value] || 0);
                }} className="mt-2 w-full px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-xs">
                  <option value="">No Ad</option>
                  <option value="standard">Standard ($110)</option>
                  <option value="featured">Featured ($160)</option>
                  <option value="premium">Premium ($400)</option>
                  <option value="elite">Elite ($600)</option>
                </select>
              </div>
            ))}
            {ads.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">No active ads</p>}
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
                    <th className="text-left p-3 text-gray-400">Ad Tier</th>
                    <th className="text-left p-3 text-gray-400">Price</th>
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
                      <td className="p-3"><span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs capitalize">{site.ad_tier || 'none'}</span></td>
                      <td className="p-3 text-green-400">${site.ad_price || 0}</td>
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
                    {p.mc_username && <p className="text-xs text-gray-400">MC: {p.mc_username} {p.mc_verified ? '✓' : ''}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/profile/${p.id}`)} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg">View</button>
                    {p.is_staff ? (
                      <button onClick={() => removeStaff(p.id)} className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg">Remove Staff</button>
                    ) : (
                      <button onClick={() => addStaff(p.id)} className="text-xs px-3 py-2 bg-green-600 text-white rounded-lg">Make Staff</button>
                    )}
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

        {!loading && activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? <p className="text-center text-gray-500 py-8">No reports</p> :
              reports.map(r => (
                <div key={r.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold">{r.sites?.name}</p>
                      <p className="text-gray-400 text-sm">Reported by: {r.profiles?.username}</p>
                      <p className="text-gray-300 mt-2">{r.reason}</p>
                    </div>
                    <button onClick={() => deleteReport(r.id)} className="px-3 py-2 bg-gray-700 text-white rounded text-sm">Dismiss</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {!loading && activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-white font-bold">{r.sites?.name}</p>
                    <p className="text-gray-400 text-sm">By: {r.profiles?.username} - {r.rating} stars</p>
                    <p className="text-gray-300 mt-1">{r.comment}</p>
                  </div>
                  <button onClick={() => deleteReview(r.id)} className="px-3 py-2 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === 'bookmarks' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#202124]">
                <tr>
                  <th className="text-left p-3 text-gray-400">User</th>
                  <th className="text-left p-3 text-gray-400">Site</th>
                  <th className="text-left p-3 text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookmarks.map(b => (
                  <tr key={b.id} className="border-t border-gray-700">
                    <td className="p-3 text-gray-300">{b.profiles?.username}</td>
                    <td className="p-3 text-white">{b.sites?.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'followers' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#202124]">
                <tr>
                  <th className="text-left p-3 text-gray-400">User</th>
                  <th className="text-left p-3 text-gray-400">Following</th>
                  <th className="text-left p-3 text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {followers.map(f => (
                  <tr key={f.id} className="border-t border-gray-700">
                    <td className="p-3 text-gray-300">{f.profiles?.username}</td>
                    <td className="p-3 text-white">{f.sites?.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{new Date(f.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'upvotes' && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#202124]">
                <tr>
                  <th className="text-left p-3 text-gray-400">User</th>
                  <th className="text-left p-3 text-gray-400">Upvoted</th>
                  <th className="text-left p-3 text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {upvotes.map(u => (
                  <tr key={u.id} className="border-t border-gray-700">
                    <td className="p-3 text-gray-300">{u.profiles?.username}</td>
                    <td className="p-3 text-white">{u.sites?.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'staff' && (
          <div>
            <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 mb-4 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            <div className="space-y-2">
              {profiles.filter(p => p.is_staff).filter(p => !searchTerm || (p.username || '').toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                <div key={s.id} className="bg-[#303134] border border-gray-700 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold">{s.username}</p>
                    <p className="text-xs text-gray-500 font-mono">{s.id}</p>
                  </div>
                  <button onClick={() => removeStaff(s.id)} className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg">Remove</button>
                </div>
              ))}
              {profiles.filter(p => p.is_staff).length === 0 && <p className="text-center text-gray-500 py-8">No staff members</p>}
            </div>
          </div>
        )}

        {!loading && activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Database Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button onClick={() => navigate('/admin')} className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-left">
                  <p className="text-white text-sm font-bold">Run SQL Query</p>
                  <p className="text-gray-400 text-xs mt-1">Execute custom SQL commands</p>
                </button>
                <button onClick={() => navigate('/admin')} className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-left">
                  <p className="text-white text-sm font-bold">Export Data</p>
                  <p className="text-gray-400 text-xs mt-1">Download database as CSV</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
