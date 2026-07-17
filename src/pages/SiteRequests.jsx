import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const CATEGORIES = [
  'Retail Shop', 'Restaurant / Food', 'Real Estate', 'Bank / Finance', 'Legal Services',
  'Service (Building, Mining, etc)', 'Farm / Agriculture', 'Entertainment / Casino',
  'Government / Public Service', 'Technology / Redstone', 'Transportation',
  'Hotel / Accommodation', 'Other'
];

export default function SiteRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [userUpvotes, setUserUpvotes] = useState(new Set());
  const [form, setForm] = useState({ name: '', description: '', category: 'Other' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('site_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);

    if (user) {
      const { data: votes } = await supabase
        .from('request_upvotes')
        .select('request_id')
        .eq('user_id', user.id);
      if (votes) setUserUpvotes(new Set(votes.map(v => v.request_id)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMessage('');

    const { error } = await supabase.from('site_requests').insert({
      name: form.name,
      description: form.description,
      category: form.category,
      user_id: user.id
    });

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Request submitted!');
      setForm({ name: '', description: '', category: 'Other' });
      fetchRequests();
    }
    setSubmitting(false);
  };

  const handleUpvote = async (requestId) => {
    if (!user) return;
    const alreadyVoted = userUpvotes.has(requestId);

    if (alreadyVoted) {
      await supabase.from('request_upvotes').delete()
        .eq('user_id', user.id)
        .eq('request_id', requestId);
      await supabase.rpc('decrement_request_upvotes', { row_id: requestId });
    } else {
      await supabase.from('request_upvotes').insert({ user_id: user.id, request_id: requestId });
      await supabase.rpc('increment_request_upvotes', { row_id: requestId });
    }

    fetchRequests();
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Site Requests</h1>

        {user && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Suggest a Site</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Site Name *</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white"
                  placeholder="Name of the site/business"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
                <select
                  required value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description *</label>
                <textarea
                  required value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white"
                  rows={3} placeholder="Describe the site you'd like to see added..."
                />
              </div>
              {message && (
                <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-green-900/30 border border-green-800 text-green-400'}`}>
                  {message}
                </div>
              )}
              <button
                type="submit" disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {!user && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 mb-8 text-center">
            <p className="text-gray-400">Sign in to suggest a new site.</p>
          </div>
        )}

        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-[#303134] border border-gray-700 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{req.name}</h3>
                  <span className="inline-block mt-1 px-3 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">{req.category}</span>
                  <p className="text-gray-400 mt-2">{req.description}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    {new Date(req.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleUpvote(req.id)}
                  disabled={!user}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    userUpvotes.has(req.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" />
                  </svg>
                  {req.upvotes || 0}
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">No site requests yet. Be the first!</p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
