import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import WithdrawModal from '../components/WithdrawModal';

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/login');
      } else {
        fetchData();
      }
    };
    checkUser();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: b } = await supabase.from('balances').select('balance').eq('user_id', user.id).single();
    setBalance(b?.balance || 0);
    setLoading(false);
  };

  const forceCheckDeposit = async () => {
    setMessage('Checking Treasury API for recent payments...');
    try {
      const res = await fetch('/api/auto-deposit', { method: 'POST' });
      const data = await res.json();
      setMessage('Scan complete. Processed ' + (data.processed || 0) + ' new deposits.');
      fetchData();
    } catch (e) {
      setMessage('Error: ' + e.message);
    }
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!user) return null;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
              <p className="text-3xl font-bold text-green-500">${balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
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