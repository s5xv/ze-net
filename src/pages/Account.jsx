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
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBalance();
  }, [user, navigate]);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setBalance(data?.balance || 0);
    } catch (err) {
      console.error('Balance fetch error:', err);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const checkDeposits = async () => {
    setMessage('Checking for deposits...');
    try {
      const res = await fetch('/api/auto-deposit', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setMessage(`Processed ${data.processed || 0} deposits`);
      fetchBalance();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
          <div className="text-4xl font-bold text-green-500 mb-6">
            ${balance.toFixed(2)}
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={checkDeposits}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Check for Deposits
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Withdraw
            </button>
          </div>
          
          {message && (
            <p className="mt-4 text-sm text-blue-400">{message}</p>
          )}
        </div>

        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#303134] border border-gray-700 p-6 rounded-xl w-full max-w-md">
              <WithdrawModal
                balance={balance}
                onUpdate={() => { 
                  fetchBalance(); 
                  setShowWithdraw(false); 
                }}
                onClose={() => setShowWithdraw(false)}
              />
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
