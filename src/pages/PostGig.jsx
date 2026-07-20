import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ['Building', 'Redstone', 'Design', 'Writing', 'Editing', 'Programming', 'Consulting', 'Management', 'Farming', 'Mining', 'Transport', 'Security', 'Other'];

export default function PostGig() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', description: '', category: 'Building', price: '', price_type: 'fixed',
    delivery_days: '7', discord_username: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      apiFetch(`/api/app?action=get-gig&id=${id}`).then(d => {
        if (d.gig) {
          setForm({
            title: d.gig.title || '',
            description: d.gig.description || '',
            category: d.gig.category || 'Building',
            price: String(d.gig.price || ''),
            price_type: d.gig.price_type || 'fixed',
            delivery_days: String(d.gig.delivery_days || '7'),
            discord_username: d.gig.discord_username || ''
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const action = isEdit ? 'update-gig' : 'create-gig';
      const body = isEdit ? { id, ...form } : form;
      const data = await apiFetch(`/api/app?action=${action}`, { method: 'POST', body: JSON.stringify(body) });
      if (data.gig) navigate(`/marketplace/${data.gig.id}`);
      else setError('Failed to save gig');
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  };

  if (loading) return <Layout user={user}><main className="max-w-2xl mx-auto px-4 py-8"><p className="text-gray-500">Loading...</p></main></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-white mb-2">{isEdit ? 'Edit Gig' : 'Post a Gig'}</h1>
        <p className="text-gray-400 text-sm mb-8">Tell the community what service you offer and your price.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. I will build your modern house" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={5} placeholder="Describe what you offer, experience, examples..." className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price Type</label>
              <select value={form.price_type} onChange={e => setForm({...form, price_type: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white">
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Per Hour</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price ($)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="10.00" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Delivery (days)</label>
              <input type="number" min="1" value={form.delivery_days} onChange={e => setForm({...form, delivery_days: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Discord Username</label>
            <input type="text" value={form.discord_username} onChange={e => setForm({...form, discord_username: e.target.value})} placeholder="user#0000" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
            <p className="text-xs text-gray-500 mt-1">So buyers can contact you directly.</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold">
            {submitting ? 'Saving...' : isEdit ? 'Update Gig' : 'Post Gig'}
          </button>
        </form>
      </main>
    </Layout>
  );
}
