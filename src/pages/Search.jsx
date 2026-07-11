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
    
    // 1. Sites (Search name, description, shortcuts)
    let sitesQuery = supabase.from('sites').select('*');
    if (searchTerm) {
      sitesQuery = sitesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`);
    }
    const { data: sitesData } = await sitesQuery.order('view_count', { ascending: false }).limit(15);
    setSiteResults(sitesData || []);

    // 2. Wiki
    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(5);
    setWikiResults(wikiData || []);

    // 3. Departments (Search NAME ONLY to avoid noise)
    let deptData = [];
    if (searchTerm) {
      try {
        const { data, error } = await supabase.from('departments').select('*').ilike('name', `%${searchTerm}%`).limit(5);
        if (!error && data) deptData = data;
      } catch (e) { console.error('Dept search error', e); }
    }
    setDeptResults(deptData);

    // AI Summary (Include departments if they exist)
    const aiContext = deptData.length > 0 ? [...(sitesData || []), ...deptData] : (sitesData || []);
    if (aiContext.length > 0) {
      generateAISummary(aiContext);
    } else {
      setSummarizing(false);
    }

    // Analytics
    try {
      if (user) await supabase.from('search_history').insert({ user_id: user.id, query });
      await supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: (sitesData?.length || 0) + (wikiData?.length || 0) + deptData.length });
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
      if (data.summary) setAiSummary(data.summary);
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
            
            {/* CLEAN AI OVERVIEW CARD */}
            {summarizing && (
              <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            )}

            {aiSummary && (
              <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI Overview</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                </div>
              </div>
            )}

            {/* DEPARTMENT RESULTS */}
            {deptResults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Departments</h2>
                <div className="space-y-3">
                  {deptResults.map((dept) => (
                    <div key={dept.id} onClick={() => navigate(`/departments/${dept.slug || dept.id}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">{dept.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{dept.description || 'Government Department'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WIKI RESULTS */}
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

            {/* SITE RESULTS */}
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
