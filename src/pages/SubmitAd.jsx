import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function SubmitAd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = useState('standard');
  const [formData, setFormData] = useState({
    siteName: '',
    siteUrl: '',
    description: '',
    category: 'shop',
    imageUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const tiers = {
    standard: { name: 'Standard', price: 110, color: 'blue', description: 'Basic listing in directory' },
    featured: { name: 'Featured', price: 160, color: 'yellow', description: 'Pinned to top of category' },
    premium: { name: 'Premium', price: 400, color: 'purple', description: 'Homepage carousel rotation' },
    elite: { name: 'Elite', price: 600, color: 'cyan', description: 'Top row + diamond border' }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);

    try {
      const { error } = await supabase.from('sites').insert({
        user_id: user.id,
        name: formData.siteName,
        url: formData.siteUrl,
        description: formData.description,
        category: formData.category,
        image_url: formData.imageUrl,
        ad_tier: tier,
        ad_price: tiers[tier].price,
        is_verified: false,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      navigate('/profile');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) return <Layout><div className="p-8 text-center text-white">Please sign in</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Submit Advertisement</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.entries(tiers).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTier(key)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                tier === key 
                  ? `border-${t.color}-500 bg-${t.color}-500/10` 
                  : 'border-gray-700 bg-[#303134]'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-white">{t.name}</h3>
                <span className="text-2xl font-bold text-green-500">${t.price}</span>
              </div>
              <p className="text-gray-400 text-sm">{t.description}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-[#303134] border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Site Name *</label>
            <input
              type="text"
              required
              value={formData.siteName}
              onChange={(e) => setFormData({...formData, siteName: e.target.value})}
              className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white"
              placeholder="My Awesome Shop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Site URL *</label>
            <input
              type="url"
              required
              value={formData.siteUrl}
              onChange={(e) => setFormData({...formData, siteUrl: e.target.value})}
              className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white"
            >
              <option value="shop">Shop</option>
              <option value="bank">Bank</option>
              <option value="casino">Casino</option>
              <option value="service">Service</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
            <textarea
              required
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white"
              placeholder="Describe your site..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold"
          >
            {submitting ? 'Submitting...' : `Submit Ad ($${tiers[tier].price})`}
          </button>
        </form>
      </main>
    </Layout>
  );
}
