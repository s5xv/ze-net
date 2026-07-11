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
    
    // 1. Sites
    let sitesQuery = supabase.from('sites').select('*');
    if (searchTerm) {
      sitesQuery = sitesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`);
    }
    const { data: sitesData } = await sitesQuery.order('view_count', { ascending: false }).limit(20);
    setSiteResults(sitesData || []);

    // 2. Wiki
    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(10);
    setWikiResults(wikiData || []);

    // 3. Departments
    let deptData = [];
    if (searchTerm) {
      try {
        const { data, error } = await supabase.from('departments').select('*').ilike('name', `%${searchTerm}%`).limit(5);
        if (!error && data) deptData = data;
      } catch (e) { console.error('Dept search error', e); }
    }
    setDeptResults(deptData);

    // AI Summary
    if (sitesData && sitesData.length > 0) {
      generateAISummary(sitesData);
    } else {
      setSummarizing(false);
    }

    // Analytics
    try {
      if (user) await supabase.from('search_history').insert({ user_id: user.id, query });
      await supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: (sitesData?.length || 0) + (wikiData?.length || 0) });
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
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites, wiki, departments..." className="flex-grow px-4 py-3 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" />
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Search</button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Searching...</div>
        ) : (
          <div className="space-y-4">
            
            {/* GOOGLE-STYLE AI OVERVIEW CARD */}
            {summarizing && (
              <div className="mb-6 bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center text-gray-500 animate-pulse shadow-sm">
                <div className="inline-flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  <span className="font-medium">Generating AI Overview...</span>
                </div>
              </div>
            )}

            {aiSummary && (
              <div className="mb-6 bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">AI Overview</h3>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] whitespace-pre-wrap">{aiSummary}</p>
                </div>
                
                {/* Footer */}
                <div className="px-5 py-2 bg-gray-50 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Powered by Gemini AI</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Always verify important info.</span>
                </div>
              </div>
            )}

            {/* DEPARTMENT RESULTS */}
            {deptResults.map((dept) => (
              <div key={dept.id} onClick={() => navigate(`/departments/${dept.slug || dept.id}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md cursor-pointer transition-shadow">
                <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-1">🏛️ {dept.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{dept.description || 'Government Department'}</p>
              </div>
            ))}

            {/* WIKI RESULTS */}
            {wikiResults.map((page) => {
              const wikiText = getWikiText(page);
              return (
                <a key={page.id} href={page.url || '#'} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">📖 {page.title}</h4>
                  {wikiText && wikiText.length > 10 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{wikiText.substring(0, 150)}...</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Wiki page found (click to view)</p>
                  )}
                </a>
              );
            })}

            {/* SITE RESULTS */}
            {siteResults.map((site) => (
              <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md cursor-pointer transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      {site.name} {site.is_verified && <span className="text-blue-500 text-sm">✓</span>}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{site.description}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{site.view_count || 0} views</p>
                  </div>
                </div>
              </div>
            ))}

            {siteResults.length === 0 && wikiResults.length === 0 && deptResults.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">No results found for "{query}"</div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
