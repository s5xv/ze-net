import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

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
  const [promotedAds, setPromotedAds] = useState([]);
  const navigate = useNavigate();
  const searchId = useRef(0);

  useEffect(() => {
    setQ(query);
    if (query) fetchResults();
    else { setSiteResults([]); setWikiResults([]); setDeptResults([]); setAiSummary(null); setLoading(false); }
  }, [query]);

  const extractSearchTerms = (q) => {
    const questionWords = ['who is ', 'what is ', 'what are ', 'where is ', 'how to ', 'how do i ', 'tell me about ', 'find ', 'search for ', 'i need ', 'looking for ', 'show me '];
    let term = q;
    for (const prefix of questionWords) {
      if (term.startsWith(prefix)) { term = term.slice(prefix.length); break; }
    }
    return term.trim() || q;
  };

  const fetchResults = async () => {
    const id = ++searchId.current;
    setLoading(true);
    setAiSummary(null);
    setAiSources([]);
    try {
      const rawQuery = query.toLowerCase().trim();
      const searchTerm = extractSearchTerms(rawQuery);
      
      let sitesData = null;
      try { const d = await apiFetch('/api/app?action=search-sites', { method: 'POST', body: JSON.stringify({ q: searchTerm }) }); sitesData = d.sites || []; } catch (e) { console.error('Site search error:', e); }
      if (id === searchId.current) setSiteResults(sitesData || []);

      const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(20);
      if (id === searchId.current) setWikiResults((wikiData || []).filter(p => p.content && p.content.trim()));

      let deptData = [];
      try {
        const { data: allDepts } = await supabase.from('departments').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(50);
        if (allDepts) {
          const isDeptQuery = ['department', 'dept', 'government', 'ministry', 'agency', 'office'].some(w => searchTerm.includes(w));
          deptData = isDeptQuery ? allDepts : allDepts.filter(d =>
            d.name.toLowerCase().includes(searchTerm) ||
            (d.description || '').toLowerCase().includes(searchTerm)
          );
        }
      } catch (e) { console.error('Dept search error', e); }
      if (id === searchId.current) setDeptResults(deptData);

      const searchTerm2 = searchTerm.replace(/[%_]/g, '\\$&');
      const { data: adData } = await supabase.from('ads').select('*, sites(name)').eq('is_active', true).in('tier', ['premium', 'elite']).or(`title.ilike.%${searchTerm2}%,description.ilike.%${searchTerm2}%`).limit(10);
      const filteredAds = (adData || []).filter(ad => {
        if (ad.title?.toLowerCase().includes(searchTerm) || ad.description?.toLowerCase().includes(searchTerm)) return true;
        if (ad.sites?.name?.toLowerCase().includes(searchTerm)) return true;
        return false;
      }).slice(0, 5);
      if (id === searchId.current) setPromotedAds(filteredAds);

      const allResults = [...(sitesData || []), ...(wikiData || []), ...deptData];
      generateAISummary(allResults);

      try {
        await Promise.all([
          user ? supabase.from('search_history').insert({ user_id: user.id, query }) : Promise.resolve(),
          supabase.from('search_analytics').insert({ query, user_id: user?.id || null, results_count: allResults.length })
        ]);
      } catch (err) { console.error('Analytics error:', err); }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      if (id === searchId.current) setLoading(false);
    }
  };

  const aiId = useRef(0);
  const generateAISummary = async (results) => {
    const id = ++aiId.current;
    setSummarizing(true);
    try {
      const data = await apiFetch('/api/app?action=summarize', {
        method: 'POST',
        body: JSON.stringify({ query, results })
      });
      if (id === aiId.current && data.summary) {
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

            {promotedAds.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sponsored</h2>
                <div className="space-y-3">
                  {promotedAds.map(ad => (
                    <a key={ad.id} href={ad.link_url || '#'} target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-r from-yellow-500/5 to-orange-500/5 dark:from-yellow-500/10 dark:to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        {ad.image_url && <img src={ad.image_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-700" onError={(e) => { e.target.style.display = 'none' }} />}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{ad.title}</h3>
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-medium">{ad.tier === 'elite' ? '👑 Elite' : '⭐ Premium'}</span>
                          </div>
                          {ad.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ad.description}</p>}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {deptResults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Departments ({deptResults.length})</h2>
                <div className="space-y-3">
                  {deptResults.map((dept) => (
                    <div key={dept.id} onClick={() => navigate(`/departments/${dept.slug}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/departments/${dept.slug}`); } }} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">{dept.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{dept.description || 'Government Department'}</p>
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
                    <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/site/${site.slug}`); } }} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-blue-500/30">
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
