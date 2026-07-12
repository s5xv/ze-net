import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Site() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    let cancelled = false;
    
    const fetchSite = async () => {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        if (!cancelled) setSite(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    fetchSite();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
      </Layout>
    );
  }

  if (!site) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">Site not found</div>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Go Home</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-white">{site.name}</h1>
            {site.is_verified && <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">VERIFIED</span>}
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">Description</p>
              <p className="text-gray-300 text-lg">{site.description}</p>
            </div>
            <div>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold inline-block">Visit Site →</a>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700">
              <div><p className="text-sm text-gray-400">Category</p><p className="text-white capitalize">{site.category}</p></div>
              <div><p className="text-sm text-gray-400">Views</p><p className="text-white">{site.view_count || 0}</p></div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
