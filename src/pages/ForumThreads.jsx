import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/useRealtime';

export default function ForumThreads() {
  const { user } = useAuth();
  const { forumId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!forumId) return;
    supabase.from('forum_categories').select('*').eq('id', forumId).maybeSingle().then(({ data }) => setCategory(data)).catch(() => {});
    supabase.from('forum_threads').select('*, author:author_id(username)').eq('category_id', forumId).order('is_pinned', { ascending: false }).order('last_post_at', { ascending: false }).then(({ data }) => {
      setThreads(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [forumId]);

  usePolling(async () => {
    const { data } = await supabase.from('forum_threads').select('*, author:author_id(username)').eq('category_id', forumId).order('is_pinned', { ascending: false }).order('last_post_at', { ascending: false });
    if (data) setThreads(data);
  }, 15000, true);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{category?.title || 'Loading...'}</h1>
            {category?.description && <p className="text-sm text-gray-500 mt-1">{category.description}</p>}
          </div>
          {user && <button onClick={() => navigate(`/forums/new-thread/${forumId}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">New Thread</button>}
        </div>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div></div>)}</div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500">No threads yet</p>
            {user && <button onClick={() => navigate(`/forums/new-thread/${forumId}`)} className="mt-4 text-blue-600 hover:underline text-sm">Start the first discussion</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map(thread => (
              <div key={thread.id} onClick={() => navigate(`/forums/thread/${thread.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/forums/thread/${thread.id}`); } }} className={`bg-white dark:bg-[#303134] rounded-xl p-5 border ${thread.is_pinned ? 'border-yellow-400/50' : 'border-gray-200 dark:border-gray-700'} hover:border-blue-500/50 transition-all cursor-pointer`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      {thread.is_pinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded font-medium">Pinned</span>}
                      {thread.is_locked && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-medium">Locked</span>}
                      <h3 className="font-bold truncate">{thread.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>By {thread.author?.username || 'Unknown'}</span>
                      <span>•</span>
                      <span>{thread.reply_count || 0} replies</span>
                      <span>•</span>
                      <span>{new Date(thread.last_post_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/forums')} className="mt-6 text-sm text-gray-500 hover:text-blue-600">← Back to Categories</button>
      </main>
    </Layout>
  );
}
