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
  const [deptResults, setDeptResults] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSources, setAiSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) fetchResults();
  }, [query]);

  const fetchResults = async () => {
    setLoading(true);
    setAiSummary(null);
    setAiSources([]);
    const searchTerm = query.toLowerCase().trim();
    
    // 1. Sites
    let sitesQuery = supabase.from('sites').select('*');
    if (searchTerm) {
      sitesQuery = sitesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`);
    }
    const { data: sitesData } = await sitesQuery.order('view_count', { ascending: false }).limit(15);
    setSiteResults(sitesData || []);

    // 2. Wiki
    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(20);
    setWikiResults(wikiData || []);

    // 3. Departments (SMART SEARCH - Looks in Wiki Pages where titles start with "Department")
    let deptData = [];
    if (searchTerm) {
      try {
        // If the user is searching for departments, we look specifically at wiki pages that contain "Department" in the title
        if (searchTerm.includes('department') || searchTerm.includes('dept')) {
          const { data, error } = await supabase.from('wiki_pages').select('*').ilike('title', '%Department%').limit(30);
          if (!error && data) deptData = data;
        } else {
          // Otherwise, search by name
          const { data, error } = await supabase.from('wiki_pages').select('*').ilike('title', `%${searchTerm}%`).limit(10);
          if (!error && data) deptData = data;
        }
      } catch (e) { console.error('Dept search error', e); }
    }
    setDeptResults(deptData);

    // AI Summary (Combine everything)
    const allResults = [...(sitesData || []), ...(wikiData || []), ...deptData];
    if (allResults.length > 0) {
      generateAISummary(allResults);
    } else {
      setSummarizing(false);
    }

    try {
      if (user) await supabase.from('search_history').insert({ user_id: user.id, query });
      await supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: allResults.length });
    } catch (err) { console.error('Analytics error:', err); }
    
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
        setAiSources(data.sources || []);
      }
    } catch (err) {
      console.error('AI failed:', err);
    }
    setSummarizing(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) setSearchParams({ q: q.trim() });
  };

  const getWikiText = (page) => page.content || page.body || page.text || page.description || '';

  const renderMarkdownBold = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input 
              type="text" 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites, wiki, departments..."
              className="flex-grow px-5 py-3 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-sm transition-colors">Search</button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Searching...</div>
        ) : (
          <div className="space-y-6">
            
            {summarizing && (
              <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            )}

            {aiSummary && (
              <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">AI Overview</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Beta</span>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] whitespace-pre-wrap">
                    {renderMarkdownBold(aiSummary)}
                  </p>
                </div>
                
                {aiSources.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {aiSources.slice(0, 4).map((source, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="px-6 py-3 bg-gray-50 dark:bg-[#171717] border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Powered by Mistral AI</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Based on Z&E Net data</span>
                </div>
              </div>
            )}

            {deptResults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Departments ({deptResults.length})</h2>
                <div className="space-y-3">
                  {deptResults.map((dept) => (
                    <div key={dept.id} onClick={() => navigate(`/wiki/${dept.title}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">{dept.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{getWikiText(dept) || 'Government Department'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wikiResults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Wiki Pages</h2>
                <div className="space-y-3">
                  {wikiResults.map((page) => {
                    const wikiText = getWikiText(page);
                    return (
                      <a key={page.id} href={page.url || '#'} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all hover:border-blue-500/30">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400">{page.title}</h4>
                        {wikiText && wikiText.length > 10 ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{wikiText.substring(0, 150)}...</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic mt-1">Wiki page found (click to view)</p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {siteResults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sites</h2>
                <div className="space-y-3">
                  {siteResults.map((site) => (
                    <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-blue-500/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {site.name} {site.is_verified && <span className="text-blue-500 text-sm ml-1">✓</span>}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{site.description}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 flex-shrink-0 ml-4">
                          <p>{site.view_count || 0} views</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {siteResults.length === 0 && wikiResults.length === 0 && deptResults.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">No results found for "{query}"</div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
