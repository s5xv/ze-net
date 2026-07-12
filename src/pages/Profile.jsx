import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import WithdrawModal from '../components/WithdrawModal';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState(['shop', 'bank', 'casino', 'service', 'entertainment']);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(p);
    
    // Fetch Balance
    const { data: b } = await supabase.from('balances').select('balance').eq('user_id', id).single();
    setBalance(b?.balance || 0);

    // Fetch Prefs
    if (p?.ad_preferences && Array.isArray(p.ad_preferences)) {
      setPreferences(p.ad_preferences);
    }
    setLoading(false);
  };

  const forceCheckDeposit = async () => {
    setMessage('Checking Treasury API for recent payments...');
    try {
      // We try a few common amounts or just let the API check recent ones
      // For now, let's just trigger the auto-deposit logic manually
      const res = await fetch('/api/auto-deposit', { method: 'POST' });
      const data = await res.json();
      setMessage(`Scan complete. Processed ${data.processed || 0} new deposits.`);
      fetchData(); // Refresh balance
    } catch (e) {
      setMessage('Error: ' + e.message);
    }
  };

  const togglePref = async (cat) => {
    const newPrefs = preferences.includes(cat) 
      ? preferences.filter(p => p !== cat) 
      : [...preferences, cat];
    setPreferences(newPrefs);
    await supabase.from('profiles').update({ ad_preferences: newPrefs }).eq('id', id);
  };

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;
  if (!profile) return <Layout><div className="p-8 text-center">Profile not found.</div></Layout>;

  return (
    <Layout user={profile}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username || 'User'}</h1>
              {profile.mc_username && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  MC: {profile.mc_username} {profile.mc_verified && <span className="text-green-500">✓</span>}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
              <p className="text-3xl font-bold text-green-500">${balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={forceCheckDeposit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
            >
              Check for Deposits
            </button>
            <button 
              onClick={() => setShowWithdraw(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm"
            >
              Withdraw
            </button>
          </div>
          
          {message && <p className="mt-4 text-sm text-blue-600 dark:text-blue-400">{message}</p>}
        </div>

        {/* Ad Preferences */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Ad Preferences</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which types of ads you want to see.</p>
          <div className="flex flex-wrap gap-3">
            {['shop', 'bank', 'casino', 'service', 'entertainment'].map(cat => (
              <button 
                key={cat}
                onClick={() => togglePref(cat)}
                className={`px-4 py-2 rounded-lg font-medium capitalize text-sm transition-colors ${
                  preferences.includes(cat) 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#303134] p-6 rounded-xl w-full max-w-md">
              <WithdrawModal 
                balance={balance} 
                onUpdate={() => { fetchData(); setShowWithdraw(false); }} 
                onClose={() => setShowWithdraw(false)}
              />
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
