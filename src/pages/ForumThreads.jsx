import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function ForumThreads() {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [threads, setThreads] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [forumId]);

  const fetchThreads = async (forceRefresh = false) => {
    setLoading(true);
    
    // Get category info
    const { data: catData } = await supabase
      .from('forum_cache')
      .select('*')
      .eq('type', 'category')
      .eq('forum_id', forumId)
      .single();
    
    setCategory(catData);

    // Try to get from cache first
    const { data: cached } = await supabase
      .from('forum_cache')
      .select('*')
      .eq('type', 'thread')
      .eq('parent_id', forumId)
      .order('last_updated', { ascending: false });

    if (cached && cached.length > 0 && !forceRefresh) {
      setThreads(cached);
      setLoading(false);
      return;
    }

    // Fetch fresh data
    try {
      setRefreshing(true);
      const res = await fetch(`/api/forum-scrape?action=threads&forumId=${forumId}`);
      const data = await res.json();
      
      if (data.threads) {
        const { data: fresh } = await supabase
          .from('forum_cache')
          .select('*')
          .eq('type', 'thread')
          .eq('parent_id', forumId)
          .order('last_updated', { ascending: false });
        
        setThreads(fresh || []);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <a href="/forums" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">FORUMS</a>
        <button onClick={() => fetchThreads(true)} disabled={refreshing} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">
          {refreshing ? 'REFRESHING...' : 'REFRESH'}
        </button>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{category?.title || 'Loading...'}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{category?.content || ''}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 animate-pulse">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-3"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500 mb-4">No threads found</p>
            <button onClick={() => fetchThreads(true)} className="text-orange-500 hover:underline">
              Try refreshing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <div
                key={thread.forum_id}
                onClick={() => navigate(`/forums/thread/${thread.forum_id}`)}
                className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 hover:border-orange-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-orange-500 transition-colors">{thread.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
                      <span>By: {thread.author || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(thread.last_updated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-neutral-400 group-hover:text-orange-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/forums')}
            className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg transition-colors"
          >
            ← Back to Categories
          </button>
        </div>
      </main>
    </div>
  );
}
