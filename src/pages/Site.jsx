import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Site() {
  const { id } = useParams();
  const { user } = useAuth();
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchSite();
  }, [id]);

  const fetchSite = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setSiteData(data);
    } catch (err) {
      console.error('Error fetching site:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!siteData) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Site not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">{siteData.name}</h1>
            {siteData.is_verified && (
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                ✓ VERIFIED
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">URL</p>
              <a 
                href={siteData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 break-all"
              >
                {siteData.url}
              </a>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Category</p>
              <p className="text-white capitalize">{siteData.category}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Description</p>
              <p className="text-gray-300">{siteData.description}</p>
            </div>
            
            {siteData.image_url && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Image</p>
                <img 
                  src={siteData.image_url} 
                  alt={siteData.name}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Ad Tier</p>
              <p className="text-white capitalize">{siteData.ad_tier}</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
