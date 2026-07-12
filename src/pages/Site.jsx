import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Site() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) fetchSite();
  }, [slug]);

  const fetchSite = async () => {
    try {
      setLoading(true);
      setError('');
      
      let query = supabase.from('sites').select('*');
      
      // Try to match by slug or id
      if (slug.startsWith('http')) {
        query = query.eq('url', slug);
      } else {
        query = query.ilike('slug', slug.replace(/-/g, ' '));
      }
      
      const { data, error: fetchError } = await query.single();
      
      if (fetchError) throw fetchError;
      if (!data) throw new Error('Site not found');
      
      setSiteData(data);
    } catch (err) {
      console.error('Error fetching site:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading site...</div>
        </div>
      </Layout>
    );
  }

  if (error || !siteData) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">Site not found</div>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              Go Home
            </button>
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
            <h1 className="text-3xl font-bold text-white">{siteData.name}</h1>
            {siteData.is_verified && (
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                ✓ VERIFIED
              </span>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">Description</p>
              <p className="text-gray-300 text-lg">{siteData.description}</p>
            </div>
            
            <div className="flex gap-4">
              <a 
                href={siteData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold inline-block"
              >
                Visit Site →
              </a>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700">
              <div>
                <p className="text-sm text-gray-400">Category</p>
                <p className="text-white capitalize">{siteData.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Views</p>
                <p className="text-white">{siteData.view_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
