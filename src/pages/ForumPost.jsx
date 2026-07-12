import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/useRealtime';

export default function ForumPost() {
  const { user } = useAuth();
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;
    supabase.from('forum_threads').select('*, author:author_id(username)').eq('id', threadId).maybeSingle().then(({ data }) => {
      if (!data) { navigate('/forums'); return; }
      setThread(data);
    });
    supabase.from('forum_posts').select('*, author:author_id(username)').eq('thread_id', threadId).order('created_at').then(({ data }) => {
      setPosts(data || []);
      setLoading(false);
    });
  }, [threadId]);

  usePolling(async () => {
    const { data } = await supabase.from('forum_posts').select('*, author:author_id(username)').eq('thread_id', threadId).order('created_at');
    if (data) setPosts(data);
  }, 10000, true);

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setPosting(true);
    const { data: post } = await supabase.from('forum_posts').insert({ thread_id: parseInt(threadId), author_id: user.id, content: reply.trim() }).select('*, author:author_id(username)').maybeSingle();
    if (post) {
      setPosts(prev => [...prev, post]);
      setReply('');
      await supabase.from('forum_threads').update({ reply_count: posts.length + 1, last_post_at: new Date().toISOString() }).eq('id', threadId);
    }
    setPosting(false);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-blue-600 mb-4 block">← Back</button>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6">{thread?.title}</h1>
            <div className="space-y-4 mb-8">
              {posts.map((post, i) => (
                <div key={post.id} className="bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">{post.author?.username?.[0]?.toUpperCase() || '?'}</div>
                    <span className="text-sm font-medium">{post.author?.username || 'Unknown'}</span>
                    <span className="text-xs text-gray-500">#{i + 1}</span>
                    <span className="text-xs text-gray-500 ml-auto">{new Date(post.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                </div>
              ))}
            </div>
            {user ? (
              <form onSubmit={submitReply} className="bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium mb-3">Post a Reply</h3>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} required className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg text-sm mb-3" placeholder="Write your reply..." />
                <button type="submit" disabled={posting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-lg">{posting ? 'Posting...' : 'Post Reply'}</button>
              </form>
            ) : (
              <p className="text-center text-sm text-gray-500 py-4"><a href="/login" className="text-blue-600 hover:underline">Sign in</a> to reply</p>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
