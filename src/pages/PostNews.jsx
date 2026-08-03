import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

const CATEGORIES = ['Announcement', 'Sale', 'Event', 'Update', 'Hiring', 'General'];

export default function PostNews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', category: 'Announcement', image_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isBusiness, setIsBusiness] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch('/api/app?action=my-news'),
    ]).then(([myNewsRes]) => {
      if (myNewsRes.news) setIsBusiness(true);
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/app?action=create-news', { method: 'POST', body: JSON.stringify(form) });
      if (data.news) navigate('/news');
      else setError('Failed to post news');
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-8 w-full">
        <Link to="/news" className="text-blue-400 hover:underline text-sm mb-4 inline-block">← Back to News</Link>
        <h1 className="text-3xl font-bold mb-2">Post News</h1>
        <p className="text-gray-400 text-sm mb-8">Share an update with the community. Posts are reviewed by staff before going live.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Grand Opening: Iron's Bakery" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Content *</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={8} placeholder="What's happening? Include details, hours, location, links..." className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Image URL (optional)</label>
            <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://example.com/image.png" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold">
            {submitting ? 'Posting...' : 'Post News'}
          </button>
        </form>
      </main>
    </Layout>
  );
}
