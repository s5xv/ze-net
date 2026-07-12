import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('withdrawals');
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [ads, setAds] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'withdrawals') {
        const { data } = await supabase
          .from('withdrawal_requests')
          .select('*, profiles(mc_username, username)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setWithdrawals(data || []);
      } else if (activeTab === 'verifications') {
        const { data } = await supabase
          .from('site_verification_requests')
          .select('*, profiles(username), sites(name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setVerifications(data || []);
      } else if (activeTab === 'ads') {
        const { data } = await supabase
          .from('sites')
          .select('*, profiles(username)')
          .not('ad_tier', 'is', null)
          .order('created_at', { ascending: false });
        setAds(data || []);
      } else if (activeTab === 'sites') {
        const { data } = await supabase
          .from('sites')
          .select('*, profiles(username)')
          .order('created_at', { ascending: false });
        setSites(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (id, action) => {
    try {
      const res = await fetch('/api/approve-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        fetchData();
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleApproveVerification = async (id, siteId) => {
    try {
      await supabase.from('site_verification_requests').update({ status: 'approved' }).eq('id', id);
      if (siteId) {
        await supabase.from('sites').update({ is_verified: true }).eq('id', siteId);
      }
      setMessage('Site verified!');
      fetchData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  if (loading) return <Layout><div className="p-8 text-center text-white">Loading...</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Withdrawals ({withdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'verifications' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Verifications ({verifications.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'ads' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Ads ({ads.length})
          </button>
          <button
            onClick={() => setActiveTab('sites')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'sites' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Sites ({sites.length})
          </button>
        </div>

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <p className="text-gray-400">No pending withdrawals</p>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="bg-[#303134] p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold">{w.profiles?.username}</p>
                      <p className="text-green-500 text-2xl font-bold">${w.amount}</p>
                      {w.profiles?.mc_username && (
                        <code className="text-yellow-400 text-sm block mt-1">
                          /pay {w.profiles.mc_username} {w.amount}
                        </code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleWithdrawal(w.id, 'approve')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold">Approve</button>
                      <button onClick={() => handleWithdrawal(w.id, 'reject')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Reject</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {verifications.length === 0 ? (
              <p className="text-gray-400">No pending verifications</p>
            ) : (
              verifications.map(v => (
                <div key={v.id} className="bg-[#303134] p-4 rounded-lg border border-gray-700">
                  <p className="text-white font-bold">{v.site_name || v.sites?.name}</p>
                  <p className="text-blue-400 text-sm">{v.site_url}</p>
                  <p className="text-gray-400 text-sm">By: {v.profiles?.username}</p>
                  <button onClick={() => handleApproveVerification(v.id, v.site_id)} className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold">Approve</button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ads.map(site => (
              <div key={site.id} className="bg-[#303134] p-4 rounded-lg border border-gray-700">
                <p className="text-white font-bold">{site.name}</p>
                <p className="text-gray-400 text-sm">By: {site.profiles?.username}</p>
                <p className="text-purple-400 text-sm">Tier: {site.ad_tier} (${site.ad_price})</p>
              </div>
            ))}
          </div>
        )}

        {/* Sites Tab */}
        {activeTab === 'sites' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sites.map(site => (
              <div key={site.id} className="bg-[#303134] p-4 rounded-lg border border-gray-700">
                <p className="text-white font-bold">{site.name}</p>
                <p className="text-gray-400 text-sm">By: {site.profiles?.username}</p>
                <p className="text-gray-500 text-xs">{site.url}</p>
                {site.is_verified && <span className="text-blue-400 text-xs">✓ Verified</span>}
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
