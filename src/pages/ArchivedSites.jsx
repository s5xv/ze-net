import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function ArchivedSites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('sites').select('*').eq('status', 'archived').order('updated_at', { ascending: false }).limit(100)
      .then(({ data }) => setSites(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-white mb-2">Archived Sites</h1>
        <p className="text-gray-400 text-sm mb-8">Old and closed businesses that have left the server. History preserved.</p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : sites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-400 text-lg">No archived sites yet</p>
            <p className="text-gray-500 text-sm mt-1">When a business closes, its listing lands here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map(s => (
              <div key={s.id} className="bg-[#303134] border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {s.image_url && <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-600" onError={e => e.currentTarget.style.display = 'none'} />}
                  <div className="min-w-0">
                    <h3 className="text-white font-bold truncate">{s.name}</h3>
                    <p className="text-xs text-gray-500">{s.category}{s.subcategory ? ' / ' + s.subcategory : ''}{s.plot_number ? ' • Plot ' + s.plot_number : ''}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/site/${s.slug}`)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex-shrink-0">View Archive</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
