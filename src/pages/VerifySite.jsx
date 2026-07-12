import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function VerifySite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    siteName: '',
    siteUrl: '',
    description: '',
    category: 'shop'
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase.from('site_verification_requests').insert({
        user_id: user.id,
        site_name: formData.siteName,
        site_url: formData.siteUrl,
        description: formData.description,
        category: formData.category,
        status: 'pending'
      });

      if (error) throw error;

      setMessage('✅ Verification request submitted! Admin will review within 24 hours.');
      setTimeout(() => navigate('/profile'), 3000);
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Please sign in to verify your site</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">Verify Your Site</h1>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
              $100 ONE-TIME
            </span>
          </div>
          
          <p className="text-gray-400 mb-6">
            Get the official verified checkmark next to your site name to build trust with users.
            This is a <strong className="text-white">$100 one-time fee</strong> (not a subscription).
          </p>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-blue-300 mb-3">What you get:</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>✓ Verified checkmark badge</li>
              <li>✓ Higher ranking in search results</li>
              <li>✓ Increased trust from users</li>
              <li>✓ Priority support</li>
              <li>✓ Permanent verification (no renewals)</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Site Name *
              </label>
              <input
                type="text"
                required
                value={formData.siteName}
                onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                placeholder="My Awesome Shop"
                className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Site URL *
              </label>
              <input
                type="url"
                required
                value={formData.siteUrl}
                onChange={(e) => setFormData({...formData, siteUrl: e.target.value})}
                placeholder="https://myshop.com"
                className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white"
              >
                <option value="shop">Shop</option>
                <option value="bank">Bank</option>
                <option value="casino">Casino</option>
                <option value="service">Service</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Description *
              </label>
              <textarea
                required
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what your site offers..."
                className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                <p className={message.includes('✅') ? 'text-green-400' : 'text-red-400'}>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold text-lg transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Verification Request ($100)'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              After submission, you'll receive payment instructions via Discord DM.
            </p>
          </form>
        </div>
      </main>
    </Layout>
  );
}
