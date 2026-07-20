import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function MyGigs() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGigs = () => {
    setLoading(true);
    apiFetch('/api/app?action=my-gigs', { method: 'POST', body: '{}' })
      .then(d => setGigs(d.gigs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) fetchGigs(); }, [user]);

  const toggleStatus = async (gig, newStatus) => {
    try {
      await apiFetch('/api/app?action=update-gig', { method: 'POST', body: JSON.stringify({ id: gig.id, status: newStatus }) });
      fetchGigs();
    } catch (e) { console.error(e); }
  };

  if (!user) return <Layout user={null}><main className="p-8 text-center text-gray-500">Sign in to manage your gigs</main></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">My Gigs</h1>
          <Link to="/marketplace/post" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">+ New Gig</Link>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : gigs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">You haven't posted any gigs yet</p>
            <Link to="/marketplace/post" className="text-blue-400 hover:underline mt-2 inline-block">Post your first gig →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {gigs.map(gig => (
              <div key={gig.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/marketplace/${gig.id}`} className="text-white font-semibold hover:text-blue-400 truncate block">{gig.title}</Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{gig.category}</span>
                    <span className="text-sm font-bold text-green-400">${parseFloat(gig.price).toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${gig.status === 'active' ? 'bg-green-500/20 text-green-400' : gig.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {gig.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {gig.status === 'active' ? (
                    <button onClick={() => toggleStatus(gig, 'paused')} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded">Pause</button>
                  ) : (
                    <button onClick={() => toggleStatus(gig, 'active')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Activate</button>
                  )}
                  <Link to={`/marketplace/edit/${gig.id}`} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
