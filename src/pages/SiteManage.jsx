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
  const [description, setDescription] = useState('');
  const [shortcuts, setShortcuts] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  useEffect(() => {
    if (user) fetchSite();
  }, [slug, user]);

  const fetchSite = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    if (data) {
      if (data.owner_discord_id !== user.id) {
        alert('You do not own this site');
        navigate(`/site/${slug}`);
        return;
      }
      setSite(data);
      setDescription(data.description || '');
      setShortcuts(data.shortcuts?.join(', ') || '');
      
      const { data: anns } = await supabase.from('site_announcements').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
      setAnnouncements(anns || []);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const shortcutsArray = shortcuts.split(',').map(s => s.trim()).filter(s => s);
    const { error } = await supabase.from('sites').update({
      description,
      shortcuts: shortcutsArray
    }).eq('id', site.id);
    
    if (error) alert('Error: ' + error.message);
    else alert('Site updated!');
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    const { error } = await supabase.from('site_announcements').insert({
      site_id: site.id,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      created_by: user.id
    });
    if (error) alert('Error: ' + error.message);
    else {
      setNewAnnouncement({ title: '', content: '' });
      fetchSite();
    }
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!site) return <Layout user={user}><div className="p-8 text-center">Site not found</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage: {site.name}</h1>
          <button onClick={() => navigate(`/site/${slug}`)} className="px-4 py-2 bg-gray-100 dark:bg-[#303134] rounded-lg text-sm">View Site</button>
        </div>

        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4">Edit Site Details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Shortcuts (comma separated)</label>
              <input type="text" value={shortcuts} onChange={(e) => setShortcuts(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="e.g. rvr, bank, main" />
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save Changes</button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Announcements</h2>
          <form onSubmit={handlePostAnnouncement} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
            <input type="text" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})} placeholder="Announcement title" className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <textarea value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})} placeholder="Announcement content" rows="3" className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Post Announcement</button>
          </form>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">{ann.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.content}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(ann.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
