import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');

  const fetchKeys = async () => {
    try {
      const data = await apiFetch('/api/app?action=list-api-keys', { method: 'POST' });
      setKeys(data.keys || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (user) fetchKeys(); }, [user]);

  const createKey = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      const data = await apiFetch('/api/app?action=create-api-key', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      if (data.key) { setNewKey(data.key); setName(''); fetchKeys(); }
      else setError(data.error || 'Failed to create key');
    } catch (e) { setError(e.message); }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    await apiFetch('/api/app?action=revoke-api-key', { method: 'POST', body: JSON.stringify({ id }) }).catch(() => {});
    fetchKeys();
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
        <p className="text-gray-400 text-sm mb-8">Create read-only keys to access the Z&E Net public API from your own tools.</p>

        {!user ? (
          <div className="text-center py-16 text-gray-400">Please sign in to manage API keys.</div>
        ) : (
          <>
            {newKey && (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6">
                <p className="text-green-400 font-bold mb-1">Your new API key (copy it now — it won't be shown again):</p>
                <code className="block bg-[#202124] px-4 py-3 rounded-lg text-green-300 break-all font-mono text-sm">{newKey}</code>
                <button onClick={() => navigator.clipboard.writeText(newKey)} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Copy Key</button>
              </div>
            )}

            <div className="bg-[#303134] border border-gray-700 rounded-xl p-5 mb-6">
              <h3 className="text-white font-bold mb-3">Create a Key</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. my-bot, dashboard, phone-app"
                  className="flex-1 px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm"
                />
                <button onClick={createKey} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create</button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {keys.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No keys yet</p>
                ) : (
                  keys.map(k => (
                    <div key={k.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">🔑 {k.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Created {new Date(k.created_at).toLocaleDateString()}{k.last_used_at ? ` • Last used ${new Date(k.last_used_at).toLocaleDateString()}` : ' • Never used'}</p>
                      </div>
                      <button onClick={() => revokeKey(k.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex-shrink-0">Revoke</button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-5">
              <h3 className="text-white font-bold mb-3">Using the API</h3>
              <p className="text-gray-400 text-sm mb-3">All endpoints are GET requests with your key:</p>
              <pre className="bg-[#202124] rounded-lg p-4 text-sm text-green-300 overflow-x-auto font-mono whitespace-pre-wrap">{`GET https://zenet.redmont.app/api/public?key=YOUR_KEY&action=sites
GET https://zenet.redmont.app/api/public?key=YOUR_KEY&action=site&slug=example
GET https://zenet.redmont.app/api/public?key=YOUR_KEY&action=search&q=food
GET https://zenet.redmont.app/api/public?key=YOUR_KEY&action=stats`}</pre>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
