import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function CreateThread() {
  const { user } = useAuth();
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  if (!user) { navigate('/login'); return null; }

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setPosting(true);
    const { data: thread } = await supabase.from('forum_threads').insert({
      category_id: parseInt(categoryId), title: title.trim(), author_id: user.id, last_post_at: new Date().toISOString()
    }).select().single();

    if (thread) {
      await supabase.from('forum_posts').insert({ thread_id: thread.id, author_id: user.id, content: content.trim() });
      navigate(`/forums/${categoryId}`);
    }
    setPosting(false);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">New Thread</h1>
        <form onSubmit={submit} className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={8} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={posting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">{posting ? 'Posting...' : 'Post Thread'}</button>
            <button type="button" onClick={() => navigate(`/forums/${categoryId}`)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg">Cancel</button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
