import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useTheme } from '../hooks/useTheme';

export default function LinkAccount({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(false);
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [randomAmount, setRandomAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugData, setDebugData] = useState(null);

  useEffect(() => {
    if (user) {
      checkLink();
      generateAmountInstantly();
    }
  }, [user]);

  const checkLink = async () => {
    const { data } = await supabase.from('treasury_tokens').select('*').eq('user_id', user.id).single();
    if (data) setLinkedAccount(data);
  };

  const generateAmountInstantly = async () => {
    setErrorMsg('');
    await supabase.from('pending_verifications').delete().eq('discord_user_id', user.id).eq('status', 'waiting');

    const amount = parseFloat((Math.random() * (1.00 - 0.01) + 0.01).toFixed(2));
    setRandomAmount(amount);

    const { error } = await supabase.from('pending_verifications').insert({
      discord_user_id: user.id,
      verification_code: 'instant_check',
      amount: amount,
      expected_amount: amount,
      status: 'waiting',
      requested_at: new Date().toISOString()
    });

    if (error) {
      console.error("Database error:", error);
      setErrorMsg("System error generating amount. Please refresh.");
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    setErrorMsg('');
    setDebugData(null);
    
    try {
      // 1. Fetch debug data to see what the API is actually returning
      const debugRes = await fetch('/api/debug-txns');
      const debugJson = await debugRes.json();
      setDebugData(debugJson);

      // 2. Trigger the actual check
      const res = await fetch('/api/check-deposits');
      if (!res.ok) throw new Error('Server error');
      
      // 3. Check if we got linked
      const { data } = await supabase.from('treasury_tokens').select('*').eq('user_id', user.id).single();
      if (data) {
        setLinkedAccount(data);
      } else {
        setErrorMsg('Payment not detected yet. Check the debug data below to see what the API returned.');
      }
    } catch (err) {
      setErrorMsg('Error checking server.');
    } finally {
      setChecking(false);
    }
  };

  const handleUnlink = async () => {
    await supabase.from('treasury_tokens').delete().eq('user_id', user.id);
    setLinkedAccount(null);
    generateAmountInstantly();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <a href="/login" className="text-orange-500 hover:underline">Click here to sign in with Discord</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex justify-end gap-4 px-6 py-4">
        <a href="/" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-2xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Link Minecraft Account</h1>
        
        {linkedAccount ? (
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Account Linked</h2>
                <p className="text-neutral-400 text-sm mt-1 font-mono">UUID: {linkedAccount.account_id}</p>
              </div>
              <button onClick={handleUnlink} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Unlink</button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 space-y-6">
            <div className="text-center">
              <p className="text-neutral-300 mb-6">To link your account, pay exactly this amount to your business <span className="text-orange-500 font-bold">ZEN</span> in-game:</p>
              
              <div className="bg-black rounded-lg p-6 font-mono text-orange-500 text-4xl font-bold mb-6 border border-orange-500/30">
                ${randomAmount.toFixed(2)}
              </div>

              <div className="bg-neutral-900 rounded-lg p-4 font-mono text-green-400 text-lg mb-6 border border-neutral-800">
                /paya business ZEN {randomAmount.toFixed(2)}
              </div>

              <button 
                onClick={checkStatus} 
                disabled={checking}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors w-full"
              >
                {checking ? 'Checking...' : 'Check if I Paid'}
              </button>

              {errorMsg && <p className="mt-4 text-sm text-red-400">{errorMsg}</p>}
            </div>

            {/* DEBUG DATA */}
            {debugData && (
              <div className="mt-6 p-4 bg-neutral-900 border border-neutral-700 rounded-lg overflow-auto max-h-96">
                <h3 className="text-sm font-bold text-neutral-400 mb-2">API Debug Data (What the server sees):</h3>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
