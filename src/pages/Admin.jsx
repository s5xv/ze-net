import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: w } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles(username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      const { data: v } = await supabase
        .from('site_verification_requests')
        .select('*, profiles(username)')
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

  const handleApproveWithdrawal = async (id, userId, amount) => {
    try {
      await supabase.from('withdrawal_requests').update({ status: 'approved' }).eq('id', id);
      alert(`Approved withdrawal of $${amount}`);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRejectWithdrawal = async (id) => {
    try {
      await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleApproveVerification = async (id, siteId) => {
    try {
      await supabase.from('site_verification_requests').update({ status: 'approved' }).eq('id', id);
      await supabase.from('sites').update({ is_verified: true }).eq('id', siteId);
      alert('Site verified!');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 gap-6">
          {/* Pending Withdrawals */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Pending Withdrawals ({withdrawals.length})
            </h2>
            {withdrawals.length === 0 ? (
              <p className="text-gray-400">No pending withdrawals</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(w => (
                  <div key={w.id} className="bg-[#202124] p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{w.profiles?.username || 'Unknown'}</p>
                      <p className="text-green-500 text-2xl">${w.amount}</p>
                      <p className="text-gray-500 text-sm">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveWithdrawal(w.id, w.user_id, w.amount)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectWithdrawal(w.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                      >
                        Reject
                      </button>
                    </div>
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
                  <div key={v.id} className="bg-[#202124] p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{v.site_name}</p>
                      <p className="text-blue-400 text-sm">{v.site_url}</p>
                      <p className="text-gray-400 text-sm">By: {v.profiles?.username || 'Unknown'}</p>
                      <p className="text-gray-500 text-sm">{new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleApproveVerification(v.id, v.site_id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                    >
                      Approve
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
