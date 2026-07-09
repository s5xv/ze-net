import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Admin({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchWithdrawals();
  }, [user, navigate]);

  const fetchWithdrawals = async () => {
    const { data } = await supabase.from('pending_withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setWithdrawals(data || []);
  };

  const approveWithdrawal = async (id, userId, amount) => {
    // Mark as approved in DB
    await supabase.from('pending_withdrawals').update({ status: 'approved' }).eq('id', id);
    
    // Deduct from user balance
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
    if (balData) {
      await supabase.from('site_balances').update({ balance: balData.balance - amount }).eq('user_id', userId);
    }
    
    alert(`Approved! You now need to manually pay the user $${amount} in-game using /pay.`);
    fetchWithdrawals();
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex justify-end gap-4 px-6 py-4">
        <a href="/" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <a href="/account" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Withdrawals</h2>
          {withdrawals.length === 0 ? (
            <p className="text-neutral-500 text-sm">No pending withdrawals.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg">
                  <div>
                    <p className="font-mono text-sm text-neutral-400">User ID: {w.user_id.slice(0, 8)}...</p>
                    <p className="text-xl font-bold text-orange-500">${w.amount.toFixed(2)}</p>
                  </div>
                  <button onClick={() => approveWithdrawal(w.id, w.user_id, w.amount)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Approve & Pay</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
