import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function RegisterBusiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_discord: '',
    category: 'Retail Shop',
    plot_number: '',
    shortcut: '',
    discord_invite: '',
    website_url: '',
    description: '',
    keywords: ''
  });

  const categories = [
    'Retail Shop', 'Restaurant / Food', 'Real Estate', 'Bank / Finance', 'Legal Services',
    'Service (Building, Mining, etc)', 'Farm / Agriculture', 'Entertainment / Casino',
    'Government / Public Service', 'Technology / Redstone', 'Transportation',
    'Hotel / Accommodation', 'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('Please sign in');
      navigate('/login');
      return;
    }

    const hasPlotNumber = formData.plot_number.trim().length > 0;
    const hasDiscordInvite = formData.discord_invite.trim().length > 0;
    const hasWebsiteUrl = formData.website_url.trim().length > 0;

    if (!hasPlotNumber && !hasDiscordInvite && !hasWebsiteUrl) {
      alert(
        'Please provide at least one of the following:\n- Plot Number\n- Discord Invite Link\n- Website URL'
      );
      return;
    }

    setLoading(true);

    try {
      console.log("Submitting business:", {
        formData,
        user: user.id
      });

      const { data, error } = await supabase
        .from('business_registrations')
        .insert({
          ...formData,
          user_id: user.id,
          status: 'pending'
        })
        .select();

      console.log("Supabase response:", { data, error });

      if (error) throw error;

      console.log("Business registration created:", data);

      setSubmitted(true);

    } catch (err) {
      console.error("Business registration error:", err);
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
            <h1 className="text-3xl font-bold mb-4">Registration Submitted!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your business registration is pending admin review.</p>
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
          <h1 className="text-3xl font-bold mb-2">Register Your Business</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Submit your business for review and listing on Z&E Net</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name *</label>
              <input type="text" required value={formData.business_name} onChange={(e) => setFormData({...formData, business_name: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Exact name used in game" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Owner Discord Username *</label>
              <input type="text" required value={formData.owner_discord} onChange={(e) => setFormData({...formData, owner_discord: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="e.g., username" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Category *</label>
              <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500">
                {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>

            {/* NEW: Description Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" rows="3" placeholder="Describe what your business does..." />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search Shortcut (Optional)</label>
              <input type="text" value={formData.shortcut} onChange={(e) => setFormData({...formData, shortcut: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="e.g., rvr, bank, main" />
              <p className="text-xs text-gray-500 mt-1">A quick code people can type in the search bar to find your business instantly.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Plot Number</label>
              <input type="text" value={formData.plot_number} onChange={(e) => setFormData({...formData, plot_number: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="e.g., 78, 1, plot 002 Porock, A123" />
              <p className="text-xs text-gray-500 mt-1">Any format works - numbers only, letters, or mixed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Discord Invite Link</label>
              <input type="url" value={formData.discord_invite} onChange={(e) => setFormData({...formData, discord_invite: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="https://discord.gg/..." />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Website URL</label>
              <input type="url" value={formData.website_url} onChange={(e) => setFormData({...formData, website_url: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="https://..." />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Keywords (Optional)</label>
              <input type="text" value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" placeholder="e.g., shop, food, market" />
              <p className="text-xs text-gray-500 mt-1">Comma-separated keywords to help people find your business in search.</p>
            </div>

            <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors">
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
