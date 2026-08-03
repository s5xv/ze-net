import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS = {
  Announcement: 'bg-blue-500/20 text-blue-400',
  Sale: 'bg-green-500/20 text-green-400',
  Event: 'bg-purple-500/20 text-purple-400',
  Update: 'bg-yellow-500/20 text-yellow-400',
  Hiring: 'bg-pink-500/20 text-pink-400',
  General: 'bg-gray-500/20 text-gray-400'
};

export default function News() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/app?action=list-news')
      .then(d => setNews(d.news || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout user={user}>
      <main className="w-full max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">News</h1>
            <p className="text-sm text-gray-500 mt-1">Updates from businesses across DemocracyCraft</p>
          </div>
          <Link to="/news/post" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Post News</Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : news.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No news yet.</div>
        ) : (
          <div className="space-y-4">
            {news.map(item => (
              <article key={item.id} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General}`}>{item.category}</span>
                  <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                {item.image_url && <img src={item.image_url} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />}
                <p className="text-xs text-gray-400 mt-3">by {item.profiles?.username || 'Unknown'}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
