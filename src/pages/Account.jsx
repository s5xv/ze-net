import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import WithdrawModal from '../components/WithdrawModal';

export default function Account() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Forces re-fetch

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading, navigate, refreshKey]); // Re-runs when refreshKey changes

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch fresh profile data
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      
      const { data: b } = await supabase.from('balances').select('balance').eq('user_id', user.id).single();
      setBalance(b?.balance || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const checkDeposits = async () => {
    setMessage('Checking Treasury API...');
    try {
      const res = await fetch('/api/auto-deposit', { method: 'POST' });
      const data = await res.json();
      setMessage(`Scan complete. Processed ${data.processed || 0} deposits.`);
      fetchData();
    } catch (err) { setMessage('Error: ' + err.message); }
  };

  if (authLoading || loading) {
    return <Layout><div className="min-h-screen flex items-center justify-center text-white">Loading...</div></Layout>;
  }
  if (!user) return null;

  // Fallback name logic
  const displayName = profile?.username || user.user_metadata?.user_name || user.user_metadata?.full_name || user.email || 'User';

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <button 
            onClick={() => setRefreshKey(k => k + 1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            ↻ Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Info Card */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-blue-400">👤</span> Profile Info
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Display Name</p>
                <p className="text-white font-medium bg-[#202124] px-3 py-2 rounded-lg">{displayName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Account ID</p>
                <p className="text-gray-500 text-xs font-mono bg-[#202124] px-3 py-2 rounded-lg break-all">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-green-400">💰</span> Wallet
            </h2>
            <div className="text-center py-4 mb-4 bg-[#202124] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-green-500">${balance.toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={checkDeposits} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Check for Deposits</button>
              <button onClick={() => setShowWithdraw(true)} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Withdraw Funds</button>
            </div>
            {message && <p className="mt-4 text-sm text-blue-400 text-center">{message}</p>}
          </div>

          {/* Minecraft Linking Card */}
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 md:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-purple-400">⛏️</span> Minecraft Account
            </h2>
            
            {profile?.mc_username && profile?.mc_verified ? (
              <div className="flex items-center justify-between bg-[#202124] p-4 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">✓</div>
                  <div>
                    <p className="text-gray-400 text-sm">Linked Account</p>
                    <p className="text-white font-mono text-lg">{profile.mc_username}</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">Verified</span>
              </div>
            ) : (
              <div className="text-center py-8 bg-[#202124] rounded-lg border border-dashed border-gray-600">
                <div className="text-4xl mb-3"></div>
                <h3 className="text-white font-bold text-lg mb-2">No Minecraft Account Linked</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">Link your Minecraft account to deposit funds and verify your sites.</p>
                <button onClick={() => navigate('/link-account')} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold">Link Minecraft Account</button>
              </div>
            )}
          </div>
        </div>

        {showWithdraw && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#303134] border border-gray-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
              <WithdrawModal balance={balance} onUpdate={() => { fetchData(); setShowWithdraw(false); }} onClose={() => setShowWithdraw(false)} />
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
