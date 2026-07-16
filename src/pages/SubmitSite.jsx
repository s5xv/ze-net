import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const CATEGORIES = [
  'Retail Shop', 'Restaurant / Food', 'Real Estate', 'Bank / Finance', 'Legal Services',
  'Service (Building, Mining, etc)', 'Farm / Agriculture', 'Entertainment / Casino',
  'Government / Public Service', 'Technology / Redstone', 'Transportation',
  'Hotel / Accommodation', 'Other'
];

export default function SubmitSite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', website_url: '', owner_discord: '', category: 'Other',
    description: '', plot_number: '', shortcut: '', discord_invite: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const hasPlot = form.plot_number.trim().length > 0;
    const hasDiscord = form.discord_invite.trim().length > 0;
    const hasUrl = form.website_url.trim().length > 0;
    if (!hasPlot && !hasDiscord && !hasUrl) {
      setMessage('Please provide at least one: Plot Number, Discord Invite, or Website URL');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const data = await apiFetch('/api/app?action=submit-site', {
        method: 'POST', body: JSON.stringify(form)
      });
      if (data.error) throw new Error(data.error);
      setMessage('Submitted for review! An admin will review it shortly.');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) return <Layout user={null}><div className="p-8 text-center text-white">Please sign in to submit</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Submit Your Site</h1>
          <p className="text-gray-400 mb-6">Free listing — admin review required before going live.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Business / Site Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="Exact name used in game" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Owner Discord Username *</label>
              <input type="text" required value={form.owner_discord} onChange={(e) => setForm({...form, owner_discord: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="e.g., username" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
              <select required value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description *</label>
              <textarea required value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" rows={3} placeholder="Describe what your business does..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
              <input type="url" value={form.website_url} onChange={(e) => setForm({...form, website_url: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="https://example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Search Shortcut (Optional)</label>
              <input type="text" value={form.shortcut} onChange={(e) => setForm({...form, shortcut: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="e.g., rvr, bank, main" />
              <p className="text-xs text-gray-500 mt-1">A quick code people can type in search to find your business instantly.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Plot Number</label>
              <input type="text" value={form.plot_number} onChange={(e) => setForm({...form, plot_number: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="e.g., 78, 1, plot 002 Porock" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Discord Invite Link</label>
              <input type="url" value={form.discord_invite} onChange={(e) => setForm({...form, discord_invite: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="https://discord.gg/..." />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${message.includes('submitted') ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-red-900/30 border border-red-800 text-red-400'}`}>
                {message}
              </div>
            )}

            <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold text-lg">
              {submitting ? 'Submitting...' : 'Submit Site (Free)'}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
