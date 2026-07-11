import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LinkAccount() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [linked, setLinked] = useState(false);
  const [mcName, setMcName] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) checkLinkStatus();
  }, [user]);

  const checkLinkStatus = async () => {
    const { data } = await supabase.from('profiles').select('mc_username').eq('id', user.id).single();
    if (data?.mc_username) {
      setLinked(true);
      setMcName(data.mc_username);
    }
  };

  const handleVerify = async () => {
    if (!mcName.trim()) return setError('Please enter your Minecraft username');
    setChecking(true);
    setError('');

    try {
      // Query ONLY by account_id (MC username) and check amount
      const { data, error } = await supabase
        .from('treasury_tokens')
        .select('*')
        .eq('account_id', mcName.trim())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Find a payment between 0.01 and 1.00
      const validPayment = data?.find(p => {
        const amount = parseFloat(p.amount);
        return amount >= 0.01 && amount <= 1.00;
      });

      if (validPayment) {
        // Payment found! Link the account
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ mc_username: mcName.trim() })
          .eq('id', user.id);

        if (updateError) throw updateError;
        setLinked(true);
      } else {
        setError('No valid payment found. Did you run `/paya business ZEN 0.01`? Amount must be 0.01-1.00');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setChecking(false);
  };

  if (!user) return <Layout user={user}><div className="p-8 text-center">Please sign in</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm text-center">
          <h1 className="text-3xl font-bold mb-4">Link Minecraft Account</h1>
          {linked ? (
            <div className="text-green-500">
              <div className="text-2xl font-bold mb-2">✓ Account Linked!</div>
              <div className="text-xl font-mono">MC: {mcName}</div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                1. Run in-game:<br/>
                <code className="text-xl font-mono text-blue-600 dark:text-blue-400 font-bold block my-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  /paya business ZEN 0.01
                </code>
                2. Enter your Minecraft username:
              </p>
              
              <input 
                type="text" 
                value={mcName} 
                onChange={(e) => setMcName(e.target.value)}
                placeholder="Minecraft Username"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg mb-4 text-center text-lg font-mono"
              />
              
              {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
              
              <button 
                onClick={handleVerify}
                disabled={checking}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg"
              >
                {checking ? 'Checking...' : 'Verify Payment'}
              </button>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
