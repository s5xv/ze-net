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
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit state
  const [description, setDescription] = useState('');
  const [shortcuts, setShortcuts] = useState('');
  const [urls, setUrls] = useState([{ label: '', url: '' }]);
  const [newOwnerId, setNewOwnerId] = useState('');

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  // Reviews/Comments state
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (user) fetchSite();
  }, [slug, user]);

  const fetchSite = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    if (data) {
      // Check ownership (Discord ID match)
      if (data.owner_discord_id !== user.id && !localStorage.getItem('admin_auth')) {
        alert('You do not own this site');
        navigate(`/site/${slug}`);
        return;
      }
      setSite(data);
      setDescription(data.description || '');
      setShortcuts(data.shortcuts?.join(', ') || '');
      setUrls(data.urls && data.urls.length > 0 ? data.urls : [{ label: 'Website', url: data.url || '' }]);
      
      const { data: anns } = await supabase.from('site_announcements').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
      setAnnouncements(anns || []);

      const { data: revs } = await supabase.from('site_reviews').select('*, user_metadata:users(global_name)').eq('site_id', data.id);
      setReviews(revs || []);

      const { data: coms } = await supabase.from('site_comments').select('*').eq('site_id', data.id);
      setComments(coms || []);
    }
    setLoading(false);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    const shortcutsArray = shortcuts.split(',').map(s => s.trim()).filter(s => s);
    const validUrls = urls.filter(u => u.label && u.url);
    const primaryUrl = validUrls[0]?.url || '';

    const { error } = await supabase.from('sites').update({
      description,
      shortcuts: shortcutsArray,
      urls: validUrls,
      url: primaryUrl
    }).eq('id', site.id);
    
    if (error) alert('Error: ' + error.message);
    else alert('Site details updated!');
  };

  const handleAddUrl = () => setUrls([...urls, { label: '', url: '' }]);
  const handleRemoveUrl = (index) => setUrls(urls.filter((_, i) => i !== index));
  const handleUpdateUrl = (index, field, value) => {
    const newUrls = [...urls];
    newUrls[index][field] = value;
    setUrls(newUrls);
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    const { error } = await supabase.from('site_announcements').insert({
      site_id: site.id, title: newAnnouncement.title, content: newAnnouncement.content, created_by: user.id
    });
    if (error) alert('Error: ' + error.message);
    else { setNewAnnouncement({ title: '', content: '' }); fetchSite(); }
  };

  const handleDeleteReview = async (id) => {
    if (confirm('Delete this review?')) {
      await supabase.from('site_reviews').delete().eq('id', id);
      fetchSite();
    }
  };

  const handleDeleteComment = async (id) => {
    if (confirm('Delete this comment?')) {
      await supabase.from('site_comments').delete().eq('id', id);
      fetchSite();
    }
  };

  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (!newOwnerId.trim()) return;
    if (confirm(`Transfer ownership to Discord ID: ${newOwnerId}? You will lose access.`)) {
      const { error } = await supabase.from('sites').update({ owner_discord_id: newOwnerId.trim() }).eq('id', site.id);
      if (error) alert('Error: ' + error.message);
      else { alert('Ownership transferred!'); navigate(`/site/${slug}`); }
    }
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!site) return <Layout user={user}><div className="p-8 text-center">Site not found</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage: {site.name}</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/site/${slug}`)} className="px-4 py-2 bg-gray-100 dark:bg-[#303134] rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-[#3c4043]">View Site</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {['overview', 'details', 'links', 'announcements', 'moderation', 'ownership'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#303134] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-3xl font-bold text-blue-600">{site.view_count || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#303134] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500">Total Clicks</p>
              <p className="text-3xl font-bold text-green-600">{site.click_count || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#303134] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500">Reviews</p>
              <p className="text-3xl font-bold text-yellow-600">{reviews.length}</p>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Edit Site Details</h2>
            <form onSubmit={handleSaveDetails} className="space-y-4">
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
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Site Links</h2>
              <button onClick={handleAddUrl} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">+ Add Link</button>
            </div>
            <div className="space-y-3">
              {urls.map((urlObj, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input type="text" placeholder="Label (e.g. Discord)" value={urlObj.label} onChange={(e) => handleUpdateUrl(index, 'label', e.target.value)} className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
                  <input type="text" placeholder="URL" value={urlObj.url} onChange={(e) => handleUpdateUrl(index, 'url', e.target.value)} className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
                  <button onClick={() => handleRemoveUrl(index)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Remove</button>
                </div>
              ))}
            </div>
            <button onClick={handleSaveDetails} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Save Links</button>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Post Announcement</h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <input type="text" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})} placeholder="Title" className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
              <textarea value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})} placeholder="Content" rows="3" className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" required />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Post</button>
            </form>
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold">{ann.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> : (
                <div className="space-y-2">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#202124] rounded-lg">
                      <div>
                        <span className="text-yellow-500">{'★'.repeat(rev.rating)}</span>
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{rev.comment || 'No comment'}</span>
                      </div>
                      <button onClick={() => handleDeleteReview(rev.id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>
              {comments.length === 0 ? <p className="text-gray-500">No comments yet.</p> : (
                <div className="space-y-2">
                  {comments.map((com) => (
                    <div key={com.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#202124] rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex-grow mr-4">{com.content}</p>
                      <button onClick={() => handleDeleteComment(com.id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ownership Tab */}
        {activeTab === 'ownership' && (
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Transfer Ownership</h2>
            <p className="text-sm text-gray-500 mb-4">Current Owner ID: <span className="font-mono">{site.owner_discord_id || 'None'}</span></p>
            <form onSubmit={handleTransferOwnership} className="flex gap-2">
              <input type="text" value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} placeholder="New Owner Discord ID" className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" required />
              <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Transfer</button>
            </form>
            <p className="text-xs text-red-500 mt-2">Warning: You will lose management access immediately after transferring.</p>
          </div>
        )}
      </main>
    </Layout>
  );
}
