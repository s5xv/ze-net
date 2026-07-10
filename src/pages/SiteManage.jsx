import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function SiteManage() {
  const { user } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    url: '',
    shortcuts: '',
    keywords: '',
    is_verified: false
  });

  useEffect(() => {
    fetchSite();
  }, [slug, user]);

  const fetchSite = async () => {
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    
    if (!data) {
      alert('Site not found');
      navigate('/');
      return;
    }

    // Check if user is owner
    if (!user || data.owner_user_id !== user.id) {
      alert('You don't have permission to manage this site');
      navigate(`/site/${slug}`);
      return;
    }

    setSite(data);
    setFormData({
      name: data.name || '',
      description: data.description || '',
      category: data.category || '',
      url: data.url || '',
      shortcuts: data.shortcuts || '',
      keywords: data.keywords?.join(', ') || '',
      is_verified: data.is_verified || false
    });
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const shortcutsArray = formData.shortcuts ? formData.shortcuts.split(',').map(s => s.trim()).filter(s => s) : [];
    const keywordsArray = formData.keywords ? formData.keywords.split(',').map(s => s.trim()).filter(s => s) : [];

    const { error } = await supabase.from('sites').update({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      url: formData.url,
      shortcuts: shortcutsArray.join(', '),
      keywords: keywordsArray,
      is_verified: formData.is_verified
    }).eq('id', site.id);

    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      alert('Site updated successfully!');
      fetchSite();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this site? This cannot be undone.')) {
      const { error } = await supabase.from('sites').delete().eq('id', site.id);
      if (error) {
        alert('Error deleting: ' + error.message);
      } else {
        alert('Site deleted');
        navigate('/');
      }
    }
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!site) return null;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage: {site.name}</h1>
          <button onClick={() => navigate(`/site/${slug}`)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">
            ← Back to Site
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Site Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea 
                  required 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  rows="4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  >
                    <option value="Retail Shop">Retail Shop</option>
                    <option value="Restaurant / Food">Restaurant / Food</option>
                    <option value="Bank / Finance">Bank / Finance</option>
                    <option value="Legal Services">Legal Services</option>
                    <option value="Government / Public Service">Government / Public Service</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <input 
                    type="url" 
                    value={formData.url} 
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">SEO & Discovery</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search Shortcuts (comma separated)</label>
                <input 
                  type="text" 
                  value={formData.shortcuts} 
                  onChange={(e) => setFormData({...formData, shortcuts: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  placeholder="e.g., rvr, bank, main"
                />
                <p className="text-xs text-gray-500 mt-1">Quick codes people can type to find your site</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Keywords (comma separated, max 3)</label>
                <input 
                  type="text" 
                  value={formData.keywords} 
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  placeholder="e.g., food, pizza, restaurant"
                />
                <p className="text-xs text-gray-500 mt-1">Helps people find your site in search</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              type="button" 
              onClick={handleDelete}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Delete Site
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
