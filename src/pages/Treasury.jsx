import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Treasury() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    zecBalance: null,
    totalUserBalances: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTips: 0,
    netRevenue: 0,
    userCount: 0,
    pendingWithdrawals: 0,
    recentTransactions: [],
  });

  useEffect(() => {
    if (!user) return;
    fetchTreasury();
  }, [user]);

  const fetchTreasury = async () => {
    setLoading(true);
    try {
      const [zecRes, balRes, depRes, wdRes, tipRes, pendingRes, txnRes] = await Promise.all([
        apiFetch('/api/economy').catch(() => ({ balance: null })),
        supabase.from('balances').select('balance'),
        supabase.from('transactions').select('amount', { count: 'exact' }).eq('type', 'deposit'),
        supabase.from('transactions').select('amount', { count: 'exact' }).eq('type', 'withdrawal'),
        supabase.from('transactions').select('amount', { count: 'exact' }).eq('type', 'tip'),
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('*, profiles!inner(username)').order('created_at', { ascending: false }).limit(20),
      ]);

      const totalBal = (balRes.data || []).reduce((s, r) => s + parseFloat(r.balance || 0), 0);
      const totalDep = (depRes.data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      const totalWd = (wdRes.data || []).reduce((s, r) => s + Math.abs(parseFloat(r.amount || 0)), 0);
      const totalTp = (tipRes.data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);

      setData({
        zecBalance: zecRes?.balance ?? null,
        totalUserBalances: totalBal,
        totalDeposits: totalDep,
        totalWithdrawals: totalWd,
        totalTips: totalTp,
        netRevenue: totalDep - totalWd,
        userCount: balRes.data?.length || 0,
        pendingWithdrawals: pendingRes.count || 0,
        recentTransactions: txnRes.data || [],
      });
    } catch (e) { console.error('Treasury error:', e); }
    setLoading(false);
  };

  const stat = (label, value, cls = 'text-white') => (
    <div className="bg-[#303134] border border-gray-700 rounded-xl p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls}`}>{value}</p>
    </div>
  );

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Treasury</h1>
            <p className="text-gray-400 text-sm">Financial overview & activity</p>
          </div>
          <button onClick={fetchTreasury} disabled={loading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg text-sm">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stat('ZEC Treasury Balance', data.zecBalance !== null ? `$${parseFloat(data.zecBalance).toLocaleString()}` : '⏳', 'text-yellow-400')}
              {stat('User Balances Total', `$${data.totalUserBalances.toFixed(2)}`, 'text-green-400')}
              {stat('Net Revenue', `$${data.netRevenue.toFixed(2)}`, data.netRevenue >= 0 ? 'text-blue-400' : 'text-red-400')}
              {stat('Pending Withdrawals', data.pendingWithdrawals, data.pendingWithdrawals > 0 ? 'text-orange-400' : 'text-gray-400')}
              {stat('Total Deposits', `$${data.totalDeposits.toFixed(2)}`, 'text-green-400')}
              {stat('Total Withdrawals', `$${data.totalWithdrawals.toFixed(2)}`, 'text-red-400')}
              {stat('Total Tips', `$${data.totalTips.toFixed(2)}`, 'text-purple-400')}
              {stat('Users with Balance', data.userCount, 'text-blue-400')}
            </div>

            <div className="bg-[#303134] border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Recent Transactions</h2>
              {data.recentTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-700 text-sm text-gray-400">
                        <th className="pb-2 pr-4">User</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTransactions.map((tx, i) => (
                        <tr key={tx.txn_id || i} className="border-b border-gray-700/50 text-sm">
                          <td className="py-2 pr-4 text-white">{tx.profiles?.username || 'Unknown'}</td>
                          <td className="py-2 pr-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                              tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>{tx.type}</span>
                          </td>
                          <td className={`py-2 pr-4 font-mono ${parseFloat(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(tx.amount) >= 0 ? '+' : ''}${parseFloat(tx.amount).toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 text-gray-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="py-2 text-gray-400 text-xs max-w-xs truncate">{tx.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
