import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ['General', 'Building', 'Economy', 'Redstone', 'Tutorial', 'PvP', 'Events', 'Towns'];

function renderRichText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|_.*?_|~~.*?~~|\[.*?\]\(.*?\)|^#+ .*$)/gm);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <s key={i}>{part.slice(2, -2)}</s>;
    if (/^#{1,3} /.test(part)) return <h3 key={i} className="text-lg font-bold text-white mt-3 mb-1">{part.replace(/^#+ /, '')}</h3>;
    const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{linkMatch[1]}</a>;
    return part;
  });
}

export default function Guides() {
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'General' });
  const [activeGuide, setActiveGuide] = useState(null);

  const fetchGuides = async () => {
    setLoading(true);
    let query = supabase.from('guides').select('*, user:user_id(username)').eq('status', 'approved').order('created_at', { ascending: false });
    if (category !== 'All') query = query.eq('category', category);
    const { data } = await query.limit(100);
    setGuides(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuides(); }, [category]);

  const submitGuide = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;
    const { error } = await supabase.from('guides').insert({ user_id: user.id, title: form.title.trim(), content: form.content.trim(), category: form.category });
    if (error) { alert('Error: ' + error.message); return; }
    setForm({ title: '', content: '', category: 'General' });
    setShowCreate(false);
    fetchGuides();
  };

  const openGuide = async (g) => {
    setActiveGuide(g);
    await supabase.from('guides').update({ view_count: (g.view_count || 0) + 1 }).eq('id', g.id);
  };

  const filtered = guides.filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Guides</h1>
            <p className="text-gray-400 text-sm">Community-written tutorials, tips, and how-tos for DemocracyCraft.</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(!showCreate)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">
              {showCreate ? 'Cancel' : '+ Write Guide'}
            </button>
          )}
        </div>

        {showCreate && (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 mb-8 space-y-4">
            <h3 className="text-white font-bold">Write a Guide</h3>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Guide title" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white" />
            <div className="flex gap-3">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs text-gray-500 self-center">Markdown supported: **bold**, *italic*, # headings, [links](url)</span>
            </div>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your guide here..." rows="10" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white font-mono text-sm" />
            <button onClick={submitGuide} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">Publish Guide</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 bg-[#303134] border border-gray-700 rounded-lg text-white text-sm">
            <option value="All">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides..." className="flex-1 min-w-[200px] px-4 py-2 bg-[#303134] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : activeGuide ? (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 md:p-8">
            <button onClick={() => setActiveGuide(null)} className="text-blue-400 hover:underline text-sm mb-4">← All guides</button>
            <h1 className="text-3xl font-bold text-white mb-2">{activeGuide.title}</h1>
            <p className="text-sm text-gray-500 mb-6">by {activeGuide.profiles?.username || 'Unknown'} • {activeGuide.category} • {new Date(activeGuide.created_at).toLocaleDateString()} • {activeGuide.view_count || 0} views</p>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{renderRichText(activeGuide.content)}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-gray-400 text-lg">No guides found</p>
            <p className="text-gray-500 text-sm mt-1">Be the first to write one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(g => (
              <button key={g.id} onClick={() => openGuide(g)} className="text-left bg-[#303134] border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors">
                <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{g.category}</span>
                <h3 className="text-white font-bold mt-2 mb-1 line-clamp-2">{g.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-3">{g.content.replace(/[#*_~\[\]()]/g, '').slice(0, 140)}...</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">{g.profiles?.username || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">👁 {g.view_count || 0}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
