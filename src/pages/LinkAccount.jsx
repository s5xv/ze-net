import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LinkAccount() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [linked, setLinked] = useState(false);
  const [mcName, setMcName] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user) {
      checkLinkStatus();
      const interval = setInterval(checkLinkStatus, 3000); // Auto-check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkLinkStatus = async () => {
    const { data } = await supabase.from('treasury_tokens').select('account_id').eq('user_id', user.id).single();
    if (data?.account_id) {
      setLinked(true);
      setMcName(data.account_id);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    await checkLinkStatus();
    setTimeout(() => setChecking(false), 1000);
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
              <button onClick={() => window.location.href = '/account'} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Go to Account
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                To link your account, run this command in-game:
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 border-2 border-blue-500">
                <code className="text-xl font-mono text-blue-600 dark:text-blue-400 font-bold">
                  /paya business ZEN 0.01
                </code>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Pay <strong>0.01 to 1.00 ZEN</strong> to the "business" account.<br/>
                The system will auto-detect your payment within a few seconds!
              </p>
              <button 
                onClick={handleManualCheck}
                disabled={checking}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
              >
                {checking ? 'Checking...' : 'Check Payment Status'}
              </button>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
