import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function VerifySite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [formData, setFormData] = useState({ site_name: '', site_url: '' });

  const VERIFICATION_FEE = 100;

  useEffect(() => {
    if (user) fetchBalance();
  }, [user]);

  const fetchBalance = async () => {
    const { data } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(data?.balance || 0);
  };

  const canAfford = balance >= VERIFICATION_FEE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { alert('Please sign in'); navigate('/login'); return; }
    if (!canAfford) { alert('Insufficient balance. You need $100 to verify a site.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('site_verification_requests').insert({
        site_name: formData.site_name,
        site_url: formData.site_url,
        user_id: user.id,
        status: 'pending'
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout user={user}>
        <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4">Verification Request Submitted!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your request is pending admin review. Once approved, <strong>${VERIFICATION_FEE}</strong> will be deducted from your balance and your site will receive the verified badge.
            </p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Back to Home</button>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Verify Your Site</h1>
            <span className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded-full">✓ VERIFIED</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get the official verified checkmark next to your site name to build trust with users.</p>

          <div className="mb-6 p-4 bg-gray-100 dark:bg-[#202124] rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
              <p className="text-2xl font-bold text-green-600">${balance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Verification Fee</p>
              <p className="text-2xl font-bold text-blue-600">${VERIFICATION_FEE}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Site Name *</label>
              <input type="text" required value={formData.site_name} onChange={(e) => setFormData({...formData, site_name: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Exact name of your site" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Site URL *</label>
              <input type="url" required value={formData.site_url} onChange={(e) => setFormData({...formData, site_url: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="https://..." />
            </div>

            {!canAfford && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Insufficient balance. You need ${VERIFICATION_FEE - balance} more to verify a site.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading || !canAfford} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors">
              {loading ? 'Submitting...' : `Request Verification ($${VERIFICATION_FEE})`}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
