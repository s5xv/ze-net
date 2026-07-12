import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function Admin() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: w } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles(mc_username, username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      const { data: v } = await supabase
        .from('site_verification_requests')
        .select('*, profiles(username), sites(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      setWithdrawals(w || []);
      setVerifications(v || []);
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
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Withdrawals */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Pending Withdrawals ({withdrawals.length})
            </h2>
            {withdrawals.length === 0 ? (
              <p className="text-gray-400">No pending withdrawals</p>
            ) : (
              <div className="space-y-4">
                {withdrawals.map(w => (
                  <div key={w.id} className="bg-[#202124] p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-bold">{w.profiles?.username || 'Unknown'}</p>
                        <p className="text-green-500 text-2xl font-bold">${w.amount}</p>
                        {w.profiles?.mc_username && (
                          <p className="text-gray-400 text-sm">MC: {w.profiles.mc_username}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWithdrawal(w.id, 'approve')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleWithdrawal(w.id, 'reject')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    {w.profiles?.mc_username && (
                      <div className="bg-gray-800 p-3 rounded text-sm">
                        <p className="text-gray-400 mb-1">Payment command:</p>
                        <code className="text-yellow-400 font-mono">
                          /pay {w.profiles.mc_username} {w.amount}
                        </code>
                      </div>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(w.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Verifications */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Pending Site Verifications ({verifications.length})
            </h2>
            {verifications.length === 0 ? (
              <p className="text-gray-400">No pending verifications</p>
            ) : (
              <div className="space-y-3">
                {verifications.map(v => (
                  <div key={v.id} className="bg-[#202124] p-4 rounded-lg">
                    <p className="text-white font-bold">{v.site_name || v.sites?.name || 'Unknown Site'}</p>
                    <p className="text-blue-400 text-sm">{v.site_url}</p>
                    <p className="text-gray-400 text-sm">By: {v.profiles?.username || 'Unknown'}</p>
                    <button
                      onClick={() => handleApproveVerification(v.id, v.site_id)}
                      className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm"
                    >
                      Approve Verification
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
