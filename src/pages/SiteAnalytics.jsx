import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

export default function SiteAnalytics() {
  const { user } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, upvotes: 0, reviews: 0, comments: 0, followers: 0, hasAds: false, adViews: null, adClicks: null });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchAnalytics();
  }, [slug]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/app?action=get-analytics&slug=${encodeURIComponent(slug)}`);
      setStats(d.stats);
      const { data: siteData } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
      setSite(siteData);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (loading) return <Layout user={user}><main className="max-w-4xl mx-auto px-4 py-8"><p className="text-gray-500">Loading...</p></main></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{site?.name}</h1>
            <p className="text-gray-500 text-sm">Analytics Dashboard</p>
          </div>
          <a href={`/site/${slug}/manage`} className="text-sm text-blue-600 hover:underline">← Back to Manage</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Views', value: stats.views, color: 'blue', cls: 'text-blue-600 dark:text-blue-400' },
            { label: 'Upvotes', value: stats.upvotes, color: 'green', cls: 'text-green-600 dark:text-green-400' },
            { label: 'Reviews', value: stats.reviews, color: 'purple', cls: 'text-purple-600 dark:text-purple-400' },
            { label: 'Comments', value: stats.comments, color: 'orange', cls: 'text-orange-600 dark:text-orange-400' },
            { label: 'Followers', value: stats.followers, color: 'pink', cls: 'text-pink-600 dark:text-pink-400' },
            ...(stats.hasAds ? [
              { label: 'Ad Views', value: stats.adViews ?? 0, color: 'indigo', cls: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Ad Clicks', value: stats.adClicks ?? 0, color: 'teal', cls: 'text-teal-600 dark:text-teal-400' },
            ] : []),
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#303134] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.cls}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
