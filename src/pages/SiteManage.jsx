import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import ImageUpload from '../components/ImageUpload';

export default function SiteManage() {
  const { user, loading } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', url: '', shortcuts: '', keywords: '', is_verified: false
  });

  useEffect(() => {
    if (!loading && user && slug) fetchSite();
  }, [slug, user, loading]);

  const fetchSite = async () => {
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
    if (!data) { alert('Site not found'); navigate('/'); return; }

    if (data.owner_user_id && data.owner_user_id !== user.id) {
      alert(`Permission denied.`); navigate(`/site/${slug}`); return;
    }

    setSite(data);
    setFormData({
      name: data.name || '', description: data.description || '', category: data.category || '',
      url: data.url || '', shortcuts: data.shortcuts || '', keywords: data.keywords?.join(', ') || '',
      is_verified: data.is_verified || false, image_url: data.image_url || ''
    });

    // Fetch Announcements
    const { data: annData } = await supabase.from('site_announcements').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
    setAnnouncements(annData || []);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    const shortcutsArray = formData.shortcuts ? formData.shortcuts.split(',').map(s => s.trim()).filter(s => s) : [];
    const keywordsArray = formData.keywords ? formData.keywords.split(',').map(s => s.trim()).filter(s => s) : [];

    const { error } = await supabase.from('sites').update({
      name: formData.name, description: formData.description, category: formData.category,
      url: formData.url, shortcuts: shortcutsArray.join(', '), keywords: keywordsArray,
      is_verified: formData.is_verified, image_url: formData.image_url
    }).eq('id', site.id);

    if (error) alert('Error saving: ' + error.message);
    else { alert('Site updated successfully!'); fetchSite(); }
    setSaving(false);
  };

  // NEW: Handle Announcements
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    const { error } = await supabase.from('site_announcements').insert({
      site_id: site.id, title: newAnnTitle, content: newAnnContent
    });
    if (error) alert('Error posting: ' + error.message);
    else { setNewAnnTitle(''); setNewAnnContent(''); fetchSite(); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (confirm('Delete this announcement?')) {
      await supabase.from('site_announcements').delete().eq('id', id);
      fetchSite();
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this site? This cannot be undone.')) {
      const { error } = await supabase.from('sites').delete().eq('id', site.id);
      if (error) alert('Error deleting: ' + error.message);
      else { alert('Site deleted'); navigate('/'); }
    }
  };

  if (loading) return <Layout user={null}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!user) return <Layout user={null}><div className="p-8 text-center">Please sign in</div></Layout>;
  if (!site) return <Layout user={user}><div className="p-8 text-center">Loading site...</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage: {site.name}</h1>
          <div className="flex gap-2">
            <a href={`/site/${slug}/analytics`} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Analytics</a>
            <button onClick={() => navigate(`/site/${slug}`)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">← Back to Site</button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 mb-8">
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Site Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" rows="4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg">
                    {['Retail Shop','Restaurant / Food','Real Estate','Bank / Finance','Legal Services','Service (Building, Mining, etc)','Farm / Agriculture','Entertainment / Casino','Government / Public Service','Technology / Redstone','Transportation','Hotel / Accommodation','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <input type="url" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Site Image</h2>
            <div className="flex items-center gap-4">
              {formData.image_url && <img src={formData.image_url} alt="" className="w-24 h-24 rounded-lg object-cover" />}
              <ImageUpload bucket="site-images" path={slug} onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))} label="Upload Image" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">SEO & Discovery</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search Shortcuts (comma separated)</label>
                <input type="text" value={formData.shortcuts} onChange={(e) => setFormData({...formData, shortcuts: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="e.g., rvr, bank, main" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Keywords (comma separated, max 3)</label>
                <input type="text" value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="e.g., food, pizza, restaurant" />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleDelete} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Delete Site</button>
          </div>
        </form>

        {/* NEW: ANNOUNCEMENTS MANAGEMENT */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">📢 Announcements & Updates</h2>
          
          <form onSubmit={handleCreateAnnouncement} className="mb-6 space-y-3 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
            <input 
              type="text" 
              placeholder="Announcement Title" 
              value={newAnnTitle} 
              onChange={(e) => setNewAnnTitle(e.target.value)} 
              required 
              className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" 
            />
            <textarea 
              placeholder="Announcement Content" 
              value={newAnnContent} 
              onChange={(e) => setNewAnnContent(e.target.value)} 
              required 
              rows="3" 
              className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" 
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Post Announcement</button>
          </form>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No announcements yet.</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <h3 className="font-bold text-blue-600 dark:text-blue-400">{ann.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-1">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(ann.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex-shrink-0">Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
