import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Search() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [q, setQ] = useState(query);
  const [siteResults, setSiteResults] = useState([]);
  const [wikiResults, setWikiResults] = useState([]);
  const [featuredSnippet, setFeaturedSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      fetchResults();
      // Send to Discord webhook
      fetch('/api/search-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId: user?.id })
      }).catch(err => console.error('Webhook error:', err));
    }
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    const searchTerm = query.toLowerCase().trim();
    
    const { data: wikiData } = await supabase
      .from('wiki_pages')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('title', { ascending: true })
      .limit(20);
    setWikiResults(wikiData || []);

    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`)
      .order('view_count', { ascending: false })
      .limit(10);
    setSiteResults(sitesData || []);

    if (sitesData?.length) {
      const top = sitesData[0];
      setFeaturedSnippet({ type: 'site', title: top.name, description: top.description || 'No description', url: top.url, slug: top.slug });
    } else if (wikiData?.length) {
      const withContent = wikiData.find(w => w.content && w.content.length > 10);
      if (withContent) {
        const summary = withContent.content.split('\n').filter(p => p.trim())[0]?.substring(0, 200) || '';
        setFeaturedSnippet({ type: 'wiki', title: withContent.title, description: summary + '...', url: withContent.url });
      }
    }

    if (user) await supabase.from('search_history').insert({ user_id: user.id, query });
    await supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: (sitesData?.length || 0) + (wikiData?.length || 0) });
    setLoading(false);
  };

  const handleSearch = (e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`); };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full">
        {featuredSnippet && !loading && (
          <div className="mb-6 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">{featuredSnippet.title}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">{featuredSnippet.description}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-green-600">●</span><span>{featuredSnippet.type === 'site' ? 'Site' : 'Wiki'}</span>
              {featuredSnippet.url && <a href={featuredSnippet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{featuredSnippet.url}</a>}
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-12 text-gray-500">Searching...</div> : (
          <div className="space-y-4">
            {wikiResults.map((page) => (
              <a key={page.id} href={page.url} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">{page.title}</h4>
                {page.content && page.content.length > 10 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{page.content.split('\n').filter(p=>p.trim())[0]?.substring(0, 150)}...</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">This page exists but has no content</p>
                )}
              </a>
            ))}
            {siteResults.map((site) => (
              <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md cursor-pointer">
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1">{site.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{site.description}</p>
              </div>
            ))}
            {siteResults.length === 0 && wikiResults.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">No results found for "{query}"</div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
