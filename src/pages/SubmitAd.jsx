import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function SubmitAd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_discord: '',
    redirect_url: '',
    banner_image: '',
    tier: 'bronze'
  });

  const tiers = {
    bronze: { 
      name: 'Bronze - Standard Ad', 
      price: 600, 
      duration: '1 week', 
      features: 'Regular sidebar placement',
      type: 'normal'
    },
    silver: { 
      name: 'Silver - Premium Ad', 
      price: 1200, 
      duration: '2 weeks', 
      features: 'Highlighted placement + custom shortlink',
      type: 'normal'
    },
    gold: { 
      name: 'Gold - Featured Banner', 
      price: 2600, 
      duration: '1 month', 
      features: 'Top banner + homepage featured spot',
      type: 'sponsored'
    },
    platinum: { 
      name: 'Platinum - Sponsored', 
      price: 6000, 
      duration: '1 month', 
      features: 'Top search results + priority placement everywhere',
      type: 'sponsored'
    }
  };

  useEffect(() => {
    if (user) fetchBalance();
  }, [user]);

  const fetchBalance = async () => {
    const { data } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(data?.balance || 0);
  };

  const canAfford = balance >= tiers[formData.tier].price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to submit an ad');
      navigate('/login');
      return;
    }

    if (!canAfford) {
      alert('Insufficient balance for selected tier');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('ad_submissions').insert({
        ...formData,
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
          <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4">Ad Submitted!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your ad submission is pending admin review. Once approved, ${tiers[formData.tier].price} will be deducted from your balance.
            </p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Back to Home
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Submit an Ad</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Promote your business on Z&E Net</p>

          {/* Balance Display */}
          <div className="mb-6 p-4 bg-gray-110 dark:bg-[#202124] rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
            <p className="text-2xl font-bold text-green-600">${balance.toFixed(2)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-110 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contact Discord Username *</label>
              <input
                type="text"
                required
                value={formData.contact_discord}
                onChange={(e) => setFormData({...formData, contact_discord: e.target.value})}
                className="w-full px-4 py-2 bg-gray-110 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="e.g., username#1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target Redirect URL *</label>
              <input
                type="url"
                required
                value={formData.redirect_url}
                onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                className="w-full px-4 py-2 bg-gray-110 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ad Banner Image URL</label>
              <input
                type="url"
                value={formData.banner_image}
                onChange={(e) => setFormData({...formData, banner_image: e.target.value})}
                className="w-full px-4 py-2 bg-gray-110 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="https://... (image URL)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Select Ad Tier *</label>
              <div className="space-y-3">
                {Object.entries(tiers).map(([key, tier]) => (
                  <label key={key} className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.tier === key 
                      ? 'border-blue-600 bg-blue-600/10' 
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="tier"
                      value={key}
                      checked={formData.tier === key}
                      onChange={(e) => setFormData({...formData, tier: e.target.value})}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold flex items-center gap-2">
                          {tier.name}
                          {tier.type === 'sponsored' && <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">SPONSORED</span>}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tier.duration}</p>
                        <p className="text-xs text-gray-600 mt-1">{tier.features}</p>
                      </div>
                      <p className="text-xl font-bold text-blue-600">${tier.price}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {!canAfford && (
              <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Insufficient balance. You need ${tiers[formData.tier].price - balance} more.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canAfford}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Submitting...' : `Submit Ad ($${tiers[formData.tier].price})`}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
