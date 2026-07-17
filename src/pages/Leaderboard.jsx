import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const TABS = [
  { key: 'views', label: 'Most Viewed' },
  { key: 'upvotes', label: 'Most Upvoted' },
  { key: 'newest', label: 'Newest' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('views');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSites();
  }, [activeTab]);

  const fetchSites = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sites')
        .select('id, name, slug, category, view_count, created_at, upvotes:site_upvotes(count)')
        .eq('status', 'approved');

      if (activeTab === 'views') {
        query = query.order('view_count', { ascending: false });
      } else if (activeTab === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('view_count', { ascending: false });
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []).map(site => ({
        ...site,
        upvote_count: site.upvotes?.[0]?.count || 0,
      }));

      if (activeTab === 'upvotes') {
        result.sort((a, b) => b.upvote_count - a.upvote_count);
      }

      setSites(result);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const rankDisplay = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Leaderboard</h1>

        <div className="flex gap-2 mb-6 justify-center">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#303134] text-gray-300 hover:bg-[#3c4043]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-[#303134] rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : sites.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No sites yet</div>
          ) : (
            <div className="divide-y divide-gray-700">
              <div className="flex items-center gap-4 px-4 py-3 text-sm text-gray-400 font-medium">
                <span className="w-12 text-center">Rank</span>
                <span className="flex-1">Site</span>
                <span className="w-24 hidden sm:block">Category</span>
                <span className="w-20 text-right">Views</span>
                <span className="w-20 text-right">Upvotes</span>
              </div>
              {sites.map((site, i) => (
                <div key={site.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#3c4043] transition-colors">
                  <span className="text-2xl w-12 text-center">{rankDisplay(i)}</span>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/site/${site.slug}`}
                      className="font-semibold text-white hover:text-blue-400 transition-colors truncate block"
                    >
                      {site.name}
                    </Link>
                  </div>
                  <span className="w-24 hidden sm:block text-gray-400 text-sm truncate">{site.category}</span>
                  <span className="w-20 text-right text-gray-300">{site.view_count?.toLocaleString() || 0}</span>
                  <span className="w-20 text-right text-gray-300">{site.upvote_count?.toLocaleString() || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
