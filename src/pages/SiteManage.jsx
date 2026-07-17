import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import ImageUpload from '../components/ImageUpload';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const CATEGORIES = ['Retail Shop','Restaurant / Food','Real Estate','Bank / Finance','Legal Services','Service (Building, Mining, etc)','Farm / Agriculture','Entertainment / Casino','Government / Public Service','Technology / Redstone','Transportation','Hotel / Accommodation','Other'];

function RichEditor({ value, onChange, placeholder, rows }) {
  const [showToolbar, setShowToolbar] = useState(false);
  const insert = (before, after) => {
    const ta = document.activeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + (end - start)); }, 0);
  };
  return (
    <div className="relative">
      {showToolbar && (
        <div className="flex flex-wrap gap-1 mb-1 p-1 bg-gray-200 dark:bg-[#202124] rounded">
          <button type="button" onClick={() => insert('**', '**')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 font-bold">B</button>
          <button type="button" onClick={() => insert('_', '_')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 italic">I</button>
          <button type="button" onClick={() => insert('~~', '~~')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 line-through">S</button>
          <button type="button" onClick={() => insert('- ', '')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600">• List</button>
          <button type="button" onClick={() => insert('[link text](', ')')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600">🔗</button>
          <button type="button" onClick={() => insert('> ', '')} className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600">❝ Quote</button>
        </div>
      )}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" onFocus={() => setShowToolbar(true)} onBlur={() => setTimeout(() => setShowToolbar(false), 200)} />
    </div>
  );
}

const defaultCustomization = () => ({
  banner_url: '', accent_color: '', tags: [], hours: {}, social_links: [],
  gallery: [], staff: [], custom_sections: [], status: '', rating_breakdown: {}
});

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
    name: '', description: '', category: '', subcategory: '', url: '', shortcuts: '', keywords: '', is_verified: false
  });
  const [customization, setCustomization] = useState({
    banner_url: '', accent_color: '', tags: [], hours: {}, social_links: [],
    gallery: [], staff: [], custom_sections: [], status: '', rating_breakdown: {}
  });
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '' });
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', description: '', expires_at: '' });
  const [scheduledDate, setScheduledDate] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!loading && user && slug) fetchSite();
  }, [slug, user, loading]);

  // Backup drafts
  useEffect(() => {
    if (!site) return;
    const saved = localStorage.getItem('site_draft_' + site.id);
    if (saved && !draftRestored) {
      const ask = confirm('A saved draft exists. Restore it?');
      if (ask) {
        try {
          const draft = JSON.parse(saved);
          setFormData(prev => ({ ...prev, ...draft }));
          setDraftRestored(true);
        } catch(e) {}
      } else {
        localStorage.removeItem('site_draft_' + site.id);
        setDraftRestored(true);
      }
    }
  }, [site]);
  useEffect(() => {
    if (!site) return;
    const timer = setTimeout(() => {
      localStorage.setItem('site_draft_' + site.id, JSON.stringify(formData));
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, site]);

  const fetchSite = async () => {
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
    if (!data) { alert('Site not found'); navigate('/'); return; }

    if (data.owner_user_id && data.owner_user_id !== user.id) {
      alert(`Permission denied.`); navigate(`/site/${slug}`); return;
    }

    setSite(data);
    setFormData({
      name: data.name || '', description: data.description || '', category: data.category || '',
      subcategory: data.subcategory || '', url: data.url || '', shortcuts: data.shortcuts || '',
      keywords: data.keywords?.join(', ') || '',
      is_verified: data.is_verified || false, image_url: data.image_url || ''
    });
    setCustomization({ ...defaultCustomization(), ...(data.customization || {}) });

    // Fetch Announcements
    const { data: annData } = await supabase.from('site_announcements').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
    setAnnouncements(annData || []);

    // Fetch Events & Coupons
    const { data: evData } = await supabase.from('site_events').select('*').eq('site_id', data.id).order('event_date', { ascending: true });
    setEvents(evData || []);
    const { data: cpData } = await supabase.from('site_coupons').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
    setCoupons(cpData || []);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    const shortcutsArray = formData.shortcuts ? formData.shortcuts.split(',').map(s => s.trim()).filter(s => s) : [];
    const keywordsArray = formData.keywords ? formData.keywords.split(',').map(s => s.trim()).filter(s => s) : [];

    const { error } = await supabase.from('sites').update({
      name: formData.name, description: formData.description, category: formData.category,
      subcategory: formData.subcategory, url: formData.url,
      shortcuts: shortcutsArray.join(', '), keywords: keywordsArray,
      is_verified: formData.is_verified, image_url: formData.image_url,
      customization
    }).eq('id', site.id);

    if (error) alert('Error saving: ' + error.message);
    else { alert('Site updated successfully!'); fetchSite(); }
    setSaving(false);
  };

  // NEW: Handle Announcements
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    const payload = { site_id: site.id, title: newAnnTitle, content: newAnnContent };
    if (scheduledDate) payload.scheduled_at = scheduledDate;
    const { error } = await supabase.from('site_announcements').insert(payload);
    if (error) alert('Error posting: ' + error.message);
    else { setNewAnnTitle(''); setNewAnnContent(''); setScheduledDate(''); fetchSite(); }
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
                <RichEditor value={formData.description} onChange={(v) => setFormData({...formData, description: v})} placeholder="Describe your site..." rows="4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subcategory</label>
                  <input type="text" value={formData.subcategory} onChange={(e) => setFormData({...formData, subcategory: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="e.g. Pizza, Tools, etc." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website URL</label>
                <input type="url" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="https://..." />
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

          {/* CUSTOMIZATION */}
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Site Customization</h2>
            <div className="space-y-6">

              {/* Banner */}
              <div>
                <label className="block text-sm font-medium mb-2">Banner Image</label>
                {customization.banner_url && <img src={customization.banner_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
                <ImageUpload bucket="site-images" path={slug + '/banner'} onUpload={(url) => setCustomization({...customization, banner_url: url})} label="Upload Banner" />
                {customization.banner_url && <button onClick={() => setCustomization({...customization, banner_url: ''})} className="ml-2 text-xs text-red-500">Remove</button>}
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={customization.accent_color || '#3b82f6'} onChange={(e) => setCustomization({...customization, accent_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
                  <input type="text" value={customization.accent_color} onChange={(e) => setCustomization({...customization, accent_color: e.target.value})} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg font-mono" placeholder="#3b82f6" />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                <input type="text" value={customization.tags?.join(', ')} onChange={(e) => setCustomization({...customization, tags: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="24/7, Restaurant, PVP" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status Badge</label>
                <select value={customization.status} onChange={(e) => setCustomization({...customization, status: e.target.value})} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg">
                  <option value="">None</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="busy">Busy</option>
                </select>
              </div>

              {/* Hours */}
              <div>
                <label className="block text-sm font-medium mb-2">Hours of Operation</label>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => (
                  <div key={day} className="flex items-center gap-2 mb-1">
                    <span className="w-24 text-sm capitalize">{day}</span>
                    <input type="text" value={customization.hours?.[day] || ''} onChange={(e) => setCustomization({...customization, hours: {...customization.hours, [day]: e.target.value}})} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="9:00 AM - 5:00 PM" />
                  </div>
                ))}
                <label className="flex items-center gap-2 mt-1 text-sm">
                  <input type="checkbox" checked={customization.hours?.open24h || false} onChange={(e) => setCustomization({...customization, hours: {...customization.hours, open24h: e.target.checked}})} />
                  Open 24/7
                </label>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium mb-2">Social Links</label>
                {(customization.social_links || []).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={link.platform} onChange={(e) => { const s = [...customization.social_links]; s[i] = {...s[i], platform: e.target.value}; setCustomization({...customization, social_links: s}); }} className="w-1/3 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="Platform (e.g. Discord)" />
                    <input type="url" value={link.url} onChange={(e) => { const s = [...customization.social_links]; s[i] = {...s[i], url: e.target.value}; setCustomization({...customization, social_links: s}); }} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="https://..." />
                    <button onClick={() => setCustomization({...customization, social_links: customization.social_links.filter((_, j) => j !== i)})} className="px-2 py-1 bg-red-600 text-white rounded text-xs">X</button>
                  </div>
                ))}
                <button onClick={() => setCustomization({...customization, social_links: [...(customization.social_links || []), {platform: '', url: ''}]})} className="px-3 py-1 bg-gray-600 text-white rounded text-sm">+ Add Link</button>
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-sm font-medium mb-2">Gallery Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(customization.gallery || []).map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                      <button onClick={() => setCustomization({...customization, gallery: customization.gallery.filter((_, j) => j !== i)})} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center">X</button>
                    </div>
                  ))}
                </div>
                <ImageUpload bucket="site-images" path={slug + '/gallery'} onUpload={(url) => setCustomization({...customization, gallery: [...(customization.gallery || []), url]})} label="Upload Gallery Image" />
              </div>

              {/* Staff */}
              <div>
                <label className="block text-sm font-medium mb-2">Staff List</label>
                {(customization.staff || []).map((member, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={member.name} onChange={(e) => { const s = [...customization.staff]; s[i] = {...s[i], name: e.target.value}; setCustomization({...customization, staff: s}); }} className="w-1/4 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="Name" />
                    <input type="text" value={member.role} onChange={(e) => { const s = [...customization.staff]; s[i] = {...s[i], role: e.target.value}; setCustomization({...customization, staff: s}); }} className="w-1/4 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="Role" />
                    <input type="text" value={member.discord || ''} onChange={(e) => { const s = [...customization.staff]; s[i] = {...s[i], discord: e.target.value}; setCustomization({...customization, staff: s}); }} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="Discord (optional)" />
                    <button onClick={() => setCustomization({...customization, staff: customization.staff.filter((_, j) => j !== i)})} className="px-2 py-1 bg-red-600 text-white rounded text-xs">X</button>
                  </div>
                ))}
                <button onClick={() => setCustomization({...customization, staff: [...(customization.staff || []), {name: '', role: '', discord: ''}]})} className="px-3 py-1 bg-gray-600 text-white rounded text-sm">+ Add Staff</button>
              </div>

              {/* Custom Sections */}
              <div>
                <label className="block text-sm font-medium mb-2">Custom Sections</label>
                {(customization.custom_sections || []).map((section, i) => (
                  <div key={i} className="mb-3 p-3 bg-gray-50 dark:bg-[#202124] rounded-lg">
                    <div className="flex gap-2 mb-2">
                      <input type="text" value={section.title} onChange={(e) => { const s = [...customization.custom_sections]; s[i] = {...s[i], title: e.target.value}; setCustomization({...customization, custom_sections: s}); }} className="flex-1 px-3 py-1.5 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded text-sm" placeholder="Section Title" />
                      <button onClick={() => setCustomization({...customization, custom_sections: customization.custom_sections.filter((_, j) => j !== i)})} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Remove</button>
                    </div>
                    <textarea value={section.content} onChange={(e) => { const s = [...customization.custom_sections]; s[i] = {...s[i], content: e.target.value}; setCustomization({...customization, custom_sections: s}); }} className="w-full px-3 py-1.5 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded text-sm" rows="3" placeholder="Section content..." />
                  </div>
                ))}
                <button onClick={() => setCustomization({...customization, custom_sections: [...(customization.custom_sections || []), {title: '', content: ''}]})} className="px-3 py-1 bg-gray-600 text-white rounded text-sm">+ Add Section</button>
              </div>

              {/* Rating Breakdown */}
              <div>
                <label className="block text-sm font-medium mb-2">Rating Breakdown</label>
                {['service', 'quality', 'price', 'staff', 'value'].map(key => (
                  <div key={key} className="flex items-center gap-2 mb-1">
                    <span className="w-20 text-sm capitalize">{key}</span>
                    <input type="range" min="0" max="5" step="0.5" value={customization.rating_breakdown?.[key] || 0} onChange={(e) => setCustomization({...customization, rating_breakdown: {...customization.rating_breakdown, [key]: parseFloat(e.target.value)}})} className="flex-1" />
                    <span className="w-8 text-sm text-right">{customization.rating_breakdown?.[key] || 0}</span>
                  </div>
                ))}
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

        {/* ANNOUNCEMENTS MANAGEMENT */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">📢 Announcements & Updates</h2>
          
          <form onSubmit={handleCreateAnnouncement} className="mb-6 space-y-3 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
            <input type="text" placeholder="Announcement Title" value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} required className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <RichEditor value={newAnnContent} onChange={setNewAnnContent} placeholder="Announcement Content" rows="3" />
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg text-sm" />
              <span className="text-xs text-gray-500">(leave empty for immediate)</span>
            </div>
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
                    <div className="flex gap-2 text-xs text-gray-400 mt-2">
                      <span>{new Date(ann.created_at).toLocaleString()}</span>
                      {ann.scheduled_at && <span className="text-yellow-500">Scheduled: {new Date(ann.scheduled_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex-shrink-0">Delete</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EVENTS MANAGEMENT */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Events</h2>
          <form onSubmit={async (e) => { e.preventDefault(); if (!newEvent.title || !newEvent.event_date) return; await supabase.from('site_events').insert({ site_id: site.id, ...newEvent }); setNewEvent({ title: '', description: '', event_date: '' }); fetchSite(); }} className="mb-6 space-y-3 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
            <input type="text" placeholder="Event Title" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} required className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <input type="text" placeholder="Description (optional)" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})} required className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Event</button>
          </form>
          <div className="space-y-2">
            {events.length === 0 ? <p className="text-sm text-gray-500 italic">No events.</p> : events.map(ev => (
              <div key={ev.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="font-bold text-sm">{ev.title}</p>
                  {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                  <p className="text-xs text-gray-400">{new Date(ev.event_date).toLocaleString()}</p>
                </div>
                <button onClick={async () => { await supabase.from('site_events').delete().eq('id', ev.id); fetchSite(); }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* COUPON MANAGEMENT */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Promo Codes / Coupons</h2>
          <form onSubmit={async (e) => { e.preventDefault(); if (!newCoupon.code) return; await supabase.from('site_coupons').insert({ site_id: site.id, ...newCoupon }); setNewCoupon({ code: '', discount: '', description: '', expires_at: '' }); fetchSite(); }} className="mb-6 space-y-3 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Code (e.g. SUMMER20)" value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})} required className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg font-mono" />
              <input type="text" placeholder="Discount (e.g. 20% off)" value={newCoupon.discount} onChange={(e) => setNewCoupon({...newCoupon, discount: e.target.value})} className="px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            </div>
            <input type="text" placeholder="Description" value={newCoupon.description} onChange={(e) => setNewCoupon({...newCoupon, description: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <input type="date" value={newCoupon.expires_at} onChange={(e) => setNewCoupon({...newCoupon, expires_at: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Coupon</button>
          </form>
          <div className="space-y-2">
            {coupons.length === 0 ? <p className="text-sm text-gray-500 italic">No coupons.</p> : coupons.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="font-mono font-bold text-sm text-green-600 dark:text-green-400">{c.code}</p>
                  <p className="text-xs text-gray-500">{c.discount}{c.description ? ' — ' + c.description : ''}</p>
                  {c.expires_at && <p className="text-xs text-red-500">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                </div>
                <button onClick={async () => { await supabase.from('site_coupons').delete().eq('id', c.id); fetchSite(); }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
