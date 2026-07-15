import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

export default function Wiki() {
  const { user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [syncResults, setSyncResults] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('is_staff').eq('id', user.id).maybeSingle().then(({ data }) => { setIsAdmin(data?.is_staff || false); setAdminLoading(false); }).catch(() => setAdminLoading(false));
      fetchWikiData();
    } else {
      setAdminLoading(false);
    }
  }, [user]);

  const fetchWikiData = async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_pages').select('*').order('title', { ascending: true });
    setPages(data || []);
    setLoading(false);
  };

  const syncWiki = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    setSyncResults(null);
    try {
      let cursor = null;
      let total = 0;
      let batches = 0;

      do {
        const params = new URLSearchParams({ action: 'wiki', limit: '20' });
        if (cursor) params.set('cursor', cursor);
        const data = await apiFetch('/api/content?' + params.toString());
        total += data.results?.wiki || 0;
        cursor = data.nextCursor || null;
        batches += 1;
        setSyncResults({ results: { wiki: total }, batches, done: !cursor });

        if (cursor) await new Promise((resolve) => setTimeout(resolve, 100));
      } while (cursor && batches < 500);

      if (cursor) throw new Error('Wiki sync stopped after 500 batches. Run it again to continue.');
      alert(`Synced ${total} wiki pages.`);
      await fetchWikiData();
    } catch (err) { 
      alert('Sync failed: ' + err.message); 
    } finally { 
      setSyncing(false); 
    }
  };

  const openPageModal = async (page) => {
    setActivePage(page);
    const { data } = await supabase.from('wiki_comments').select('*').eq('wiki_page_id', page.id).order('created_at', { ascending: false });
    setComments(data || []);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !activePage) return;
    await supabase.from('wiki_comments').insert({ 
      wiki_page_id: activePage.id, 
      user_id: user.id, 
      content: newComment.trim() 
    });
    setNewComment('');
    openPageModal(activePage);
  };

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (page.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagesBySource = {
    wiki: pages.filter(p => p.source === 'wiki').length,
    forum: pages.filter(p => p.source === 'forum').length,
    application: pages.filter(p => p.source === 'application').length,
    archive: pages.filter(p => p.source === 'archive').length
  };

  if (authLoading || adminLoading) return <Layout user={null}><div className="flex-grow flex items-center justify-center"><div className="text-gray-500">Loading...</div></div></Layout>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">DemocracyCraft Knowledge Base</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">{pages.length} total pages</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{pagesBySource.wiki}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Wiki Pages</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{pagesBySource.forum}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Forum Threads</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{pagesBySource.application}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Applications</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{pagesBySource.archive}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Archives</p>
            </div>
          </div>

          <div className="max-w-xl mx-auto mb-6">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search pages..." 
              className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
            />
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <button onClick={syncWiki} disabled={syncing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg text-sm">
                {syncing ? `Syncing Wiki${syncResults?.results?.wiki ? ` (${syncResults.results.wiki})` : '...'}` : 'Sync Wiki'}
              </button>
            </div>
          )}

          {syncResults && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-[#202124] rounded-lg max-w-md mx-auto text-left">
              <p className="font-bold mb-2">Last Sync Results:</p>
              {syncResults.results && Object.entries(syncResults.results).map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="capitalize">{key}:</span> {value || 0} pages
                </p>
              ))}
              {syncResults.batches && <p className="text-sm">Batches: {syncResults.batches}</p>}
            </div>
          )}
        </div>

        {activePage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{activePage.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="capitalize">{activePage.source || 'wiki'}</span> • {activePage.category}
                  </p>
                </div>
                <button onClick={() => setActivePage(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              <a href={activePage.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mb-4 block">View Original →</a>
              {activePage.content ? (
                <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">{activePage.content.substring(0, 1000)}...</p>
              ) : (
                <p className="text-gray-500 italic mb-6">This page has no content</p>
              )}
              
              <h3 className="font-bold text-lg mb-3">Comments ({comments.length})</h3>
              {user && (
                <form onSubmit={handleComment} className="mb-4 flex gap-2">
                  <input 
                    type="text" 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    placeholder="Add a comment..." 
                    className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" 
                  />
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Post</button>
                </form>
              )}
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredPages.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500">No pages found</p></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages.map((page) => (
              <div key={page.id} onClick={() => openPageModal(page)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-blue-600 dark:text-blue-400 flex-grow">{page.title}</h3>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize ml-2">
                    {page.source || 'wiki'}
                  </span>
                </div>
                {page.content ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{page.content.split('\n').filter(p => p.trim().length > 0)[0]?.substring(0, 150)}...</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">This page exists but has no content</p>
                )}
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{page.category}</span>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">Open Original</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
