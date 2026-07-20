import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function GigDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/app?action=get-gig&id=${id}`)
      .then(d => { if (d.gig) setGig(d.gig); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const copyDiscord = () => {
    if (gig?.discord_username) {
      navigator.clipboard.writeText(gig.discord_username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <Layout user={user}><main className="max-w-3xl mx-auto px-4 py-8"><p className="text-gray-500">Loading...</p></main></Layout>;

  if (!gig) return <Layout user={user}><main className="max-w-3xl mx-auto px-4 py-8 text-center"><p className="text-gray-400">Gig not found</p><Link to="/marketplace" className="text-blue-400 hover:underline mt-2 block">← Back to Marketplace</Link></main></Layout>;

  const isOwner = user && gig.user_id === user.id;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <Link to="/marketplace" className="text-blue-400 hover:underline text-sm mb-4 inline-block">← Back to Marketplace</Link>

        <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {(gig.profiles?.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{gig.title}</h1>
                <p className="text-sm text-gray-400">by {gig.profiles?.username || 'Unknown'}</p>
              </div>
            </div>
            {isOwner && (
              <Link to={`/marketplace/edit/${gig.id}`} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Edit</Link>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-[#202124] rounded-lg px-4 py-3 text-center min-w-[120px]">
              <p className="text-2xl font-bold text-green-400">${parseFloat(gig.price).toFixed(2)}</p>
              <p className="text-xs text-gray-400">{gig.price_type === 'hourly' ? 'per hour' : gig.price_type === 'negotiable' ? 'negotiable' : 'fixed price'}</p>
            </div>
            {gig.delivery_days && (
              <div className="bg-[#202124] rounded-lg px-4 py-3 text-center min-w-[120px]">
                <p className="text-2xl font-bold text-blue-400">{gig.delivery_days}d</p>
                <p className="text-xs text-gray-400">delivery</p>
              </div>
            )}
            <div className="bg-[#202124] rounded-lg px-4 py-3 text-center min-w-[120px]">
              <p className="text-xs text-gray-400">Category</p>
              <p className="text-white font-medium mt-1">{gig.category}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{gig.description || 'No description provided.'}</p>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
            {gig.discord_username ? (
              <div className="flex items-center gap-3">
                <div className="bg-[#202124] border border-gray-700 rounded-lg px-4 py-3 flex-1">
                  <p className="text-xs text-gray-400 mb-1">Discord</p>
                  <p className="text-white font-mono">{gig.discord_username}</p>
                </div>
                <button onClick={copyDiscord} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm whitespace-nowrap">
                  {copied ? 'Copied!' : 'Copy Discord'}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 italic">No contact info provided.</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Contact the seller on Discord to discuss and hire them.</p>
          </div>

          <div className="border-t border-gray-700 pt-4 mt-6">
            <p className="text-xs text-gray-500">Posted {new Date(gig.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
