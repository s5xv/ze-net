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
    if (query) fetchResults();
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    
    const { data: sitesData } = await supabase.from('sites').select('*').or(`name.ilike.%${query}%,description.ilike.%${query}%,shortcuts.ilike.%${query}%`).order('view_count', { ascending: false }).limit(20);
    setSiteResults(sitesData || []);

    // Get wiki pages - include both with and without content
    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(10);
    setWikiResults(wikiData || []);

    // Featured snippet - only if we have content
    if (sitesData && sitesData.length > 0) {
      const topSite = sitesData[0];
      setFeaturedSnippet({ 
        type: 'site', 
        title: topSite.name, 
        description: topSite.description || 'No description available', 
        url: topSite.url, 
        slug: topSite.slug 
      });
    } else if (wikiData && wikiData.length > 0) {
      // Find first wiki page with actual content
      const wikiWithContent = wikiData.find(w => w.content && w.content.length > 0);
      if (wikiWithContent) {
        const paragraphs = wikiWithContent.content.split('\n').filter(p => p.trim().length > 0);
        const summary = paragraphs[0]?.substring(0, 250) || wikiWithContent.content.substring(0, 200);
        
        setFeaturedSnippet({ 
          type: 'wiki', 
          title: wikiWithContent.title, 
          description: summary + (summary.length >= 250 ? '...' : ''), 
          url: wikiWithContent.url 
        });
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
            <div className="flex items-start gap-4">
              <div className="flex-grow">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">{featuredSnippet.title}</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{featuredSnippet.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-green-600 dark:text-green-400">●</span><span>{featuredSnippet.type === 'site' ? 'Site' : 'Wiki'}</span>
                  {featuredSnippet.url && <><span>•</span><a href={featuredSnippet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-md">{featuredSnippet.url}</a></>}
                </div>
              </div>
              {featuredSnippet.slug && <button onClick={() => navigate(`/site/${featuredSnippet.slug}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Visit</button>}
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-12 text-gray-500">Searching...</div> : (
          <div className="space-y-4">
            {siteResults.map((site) => (
              <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1 truncate">{site.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{site.url}</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{site.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{site.category}</span>
                  {site.shortcuts && site.shortcuts.length > 0 && <span className="text-gray-400">Shortcuts: {site.shortcuts.join(', ')}</span>}
                  <span>•</span><span>{site.view_count || 0} views</span>
                </div>
              </div>
            ))}

            {wikiResults.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-300">Wiki Pages</h3>
                <div className="space-y-3">
                  {wikiResults.map((page) => {
                    const hasContent = page.content && page.content.length > 0;
                    return (
                      <a key={page.id} href={page.url} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">{page.title}</h4>
                        {hasContent ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {page.content.split('\n').filter(p => p.trim().length > 0)[0]?.substring(0, 200) || page.content.substring(0, 200)}...
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic mt-1">This page exists but has no content</p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {siteResults.length === 0 && wikiResults.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No results found for "{query}"</p>
                <p className="text-sm text-gray-400">Try using shortcuts or different keywords</p>
              </div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
