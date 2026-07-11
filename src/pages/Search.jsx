import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [q, setQ] = useState(query);
  const [siteResults, setSiteResults] = useState([]);
  const [wikiResults, setWikiResults] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) fetchResults();
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    setAiSummary(null);
    const searchTerm = query.toLowerCase().trim();
    
    let sitesQuery = supabase.from('sites').select('*');
    
    if (searchTerm) {
      sitesQuery = sitesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`);
    }
    
    const { data: sitesData } = await sitesQuery.order('view_count', { ascending: false }).limit(20);
    setSiteResults(sitesData || []);

    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(10);
    setWikiResults(wikiData || []);

    // Generate AI Summary if we have results
    if (sitesData && sitesData.length > 0) {
      generateAISummary(sitesData);
    }

    if (user) await supabase.from('search_history').insert({ user_id: user.id, query });
    await supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: (sitesData?.length || 0) + (wikiData?.length || 0) });
    setLoading(false);
  };

  const generateAISummary = async (results) => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, results })
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
    }
    setSummarizing(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      setSearchParams({ q: q.trim() });
    }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites, wiki, shortcuts..."
              className="flex-grow px-4 py-3 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Search</button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Searching...</div>
        ) : (
          <>
            {/* AI SUMMARY */}
            {aiSummary && (
              <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">AI Summary</h3>
                    <p className="text-gray-700 dark:text-gray-300">{aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {summarizing && (
              <div className="mb-6 bg-gray-100 dark:bg-[#202124] rounded-xl p-4 text-center text-gray-500">
                <span className="animate-pulse"> Generating AI summary...</span>
              </div>
            )}

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
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1">{site.name} {site.is_verified && <span className="text-blue-500 text-sm">✓</span>}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{site.description}</p>
                      {site.keywords && site.keywords.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {site.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{site.view_count || 0} views</p>
                      <p>{site.click_count || 0} clicks</p>
                    </div>
                  </div>
                </div>
              ))}
              {siteResults.length === 0 && wikiResults.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">No results found for "{query}"</div>
              )}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
