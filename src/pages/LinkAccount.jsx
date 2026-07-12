import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LinkAccount() {
  const { user } = useAuth();
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

  const callApi = async (step) => {
    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/verify-mc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, mc_username: mcName.trim(), step })
      });

      // Prevent JSON parse errors if server returns HTML
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON:', text);
        setError('Server error. Please check Vercel logs.');
        setChecking(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        if (step === 'init') setLinked(true);
        if (step === 'confirm') setVerified(true);
      } else {
        setError(data.error || 'Failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
    setChecking(false);
  };

  if (!user) return <Layout><div className="p-8 text-center">Please sign in</div></Layout>;

  if (linked && verified) {
    return (
      <Layout user={user}>
        <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4 text-green-500">Account Verified!</h1>
            <div className="text-xl font-mono mb-2 text-white">MC: {mcName}</div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">Link Minecraft Account</h1>
          
          {!linked ? (
            <>
              <input 
                type="text" 
                value={mcName} 
                onChange={(e) => setMcName(e.target.value)}
                placeholder="Minecraft Username"
                className="w-full px-4 py-3 bg-[#202124] border border-gray-600 rounded-lg mb-4 text-center text-lg font-mono text-white"
              />
              {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
              <button 
                onClick={() => callApi('init')}
                disabled={checking}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-lg font-bold text-lg"
              >
                {checking ? 'Processing...' : 'Start Verification'}
              </button>
            </>
          ) : !verified ? (
            <>
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-300 mb-3">Step 2: Complete Payment</h3>
                <p className="text-gray-300 mb-4">In Minecraft, run this command:</p>
                <code className="block bg-black text-green-400 p-4 rounded-lg text-lg font-mono mb-4">
                  /pay-account business ZEN 1
                </code>
                <p className="text-sm text-gray-400">This costs <strong>$1.00</strong> in-game.</p>
              </div>
              
              {error && <p className="text-red-500 mb-4 text-sm whitespace-pre-line">{error}</p>}
              
              <button 
                onClick={() => callApi('confirm')}
                disabled={checking}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg font-bold text-lg"
              >
                {checking ? 'Checking Payment...' : 'Verify Payment'}
              </button>
            </>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}
