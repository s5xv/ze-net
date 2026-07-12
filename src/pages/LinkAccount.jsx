import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LinkAccount() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [linked, setLinked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [mcName, setMcName] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) checkLinkStatus();
  }, [user]);

  const checkLinkStatus = async () => {
    const { data } = await supabase.from('profiles').select('mc_username, mc_verified').eq('id', user.id).single();
    if (data?.mc_username) {
      setLinked(true);
      setMcName(data.mc_username);
      setVerified(data.mc_verified || false);
    }
  };

  const handleInit = async () => {
    if (!mcName.trim()) return setError('Please enter your Minecraft username');
    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/verify-mc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, mc_username: mcName.trim(), step: 'init' })
      });

      const data = await response.json();
      if (data.success) {
        setLinked(true);
        setError('');
      } else {
        setError(data.error || 'Failed to register username');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setChecking(false);
  };

  const handleConfirm = async () => {
    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/verify-mc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, mc_username: mcName.trim(), step: 'confirm' })
      });

      const data = await response.json();
      if (data.success) {
        setVerified(true);
        setError('');
      } else {
        setError(data.error || 'Payment not found');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setChecking(false);
  };

  if (!user) return <Layout user={user}><div className="p-8 text-center">Please sign in</div></Layout>;

  if (linked && verified) {
    return (
      <Layout user={user}>
        <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4 text-green-500">Account Verified!</h1>
            <div className="text-xl font-mono mb-2">MC: {mcName}</div>
            <p className="text-gray-500">You can now deposit funds and earn Pay-Per-View revenue.</p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm text-center">
          <h1 className="text-3xl font-bold mb-4">Link Minecraft Account</h1>
          
          {!linked ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter your Minecraft username to begin verification:
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
                onClick={handleInit}
                disabled={checking}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg"
              >
                {checking ? 'Processing...' : 'Start Verification'}
              </button>
            </>
          ) : !verified ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3">Step 2: Complete Payment</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  In Minecraft, run this command:
                </p>
                <code className="block bg-gray-900 text-green-400 p-4 rounded-lg text-lg font-mono mb-4">
                  /pay-account business ZEC 1
                </code>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This costs <strong>$1.00</strong> in-game and verifies you own this account.
                </p>
              </div>
              
              {error && <p className="text-red-500 mb-4 text-sm whitespace-pre-line">{error}</p>}
              
              <button 
                onClick={handleConfirm}
                disabled={checking}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg"
              >
                {checking ? 'Checking Payment...' : 'Verify Payment'}
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                Wait a few seconds after paying, then click the button above.
              </p>
            </>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}
