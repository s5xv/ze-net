import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const CATEGORIES = ['Government','Corporate','Service','Charity','Community','Business','Shop','Entertainment','Social','Other'];

export default function SubmitSite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', url: '', category: 'Other', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => { return () => clearTimeout(timeoutRef.current); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMessage('');

    try {
      const data = await apiFetch('/api/app?action=submit-site', {
        method: 'POST', body: JSON.stringify(form)
      });
      if (data.error) throw new Error(data.error);
      setMessage('Site submitted for review! An admin will review it shortly.');
      timeoutRef.current = setTimeout(() => navigate('/profile'), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) return <Layout><div className="p-8 text-center text-white">Please sign in to submit a site</div></Layout>;

  return (
    <Layout>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Submit Your Site</h1>
          <p className="text-gray-400 mb-6">Free listing — admin review required before going live.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Site Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="My Awesome Site" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">URL *</label>
              <input type="url" value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} required className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="https://example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={4} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white" placeholder="Tell us about your site..." />
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
