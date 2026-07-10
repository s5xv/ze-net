import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
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
  const [featuredSnippet, setFeaturedSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    verified: false,
    minRating: 0,
    sortBy: 'relevance'
  });

  useEffect(() => {
    if (query) {
      fetchResults();
    }
  }, [query, filters]);

  const fetchResults = async () => {
    setLoading(true);
    const searchTerm = query.toLowerCase().trim();
    
    let sitesQuery = supabase.from('sites').select('*');
    
    // Apply filters
    if (filters.category) {
      sitesQuery = sitesQuery.eq('category', filters.category);
    }
    if (filters.verified) {
      sitesQuery = sitesQuery.eq('is_verified', true);
    }
    
    // Search
    if (searchTerm) {
      sitesQuery = sitesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,shortcuts.ilike.%${searchTerm}%`);
    }
    
    // Sort
    if (filters.sortBy === 'views') {
      sitesQuery = sitesQuery.order('view_count', { ascending: false });
    } else if (filters.sortBy === 'rating') {
      sitesQuery = sitesQuery.order('created_at', { ascending: false }); // Would need avg rating calculation
    } else {
      sitesQuery = sitesQuery.order('view_count', { ascending: false });
    }
    
    const { data: sitesData } = await sitesQuery.limit(20);
    setSiteResults(sitesData || []);

    const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(10);
    setWikiResults(wikiData || []);

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      setSearchParams({ q: q.trim() });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-bold mb-4">Filters</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select 
                    value={filters.category} 
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="Retail Shop">Retail Shop</option>
                    <option value="Restaurant / Food">Restaurant / Food</option>
                    <option value="Bank / Finance">Bank / Finance</option>
                    <option value="Government / Public Service">Government</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={filters.verified} 
                    onChange={(e) => handleFilterChange('verified', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">Verified Only</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select 
                    value={filters.sortBy} 
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="views">Most Viewed</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                <button 
                  onClick={() => setFilters({ category: '', verified: false, minRating: 0, sortBy: 'relevance' })}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search..."
                  className="flex-grow px-4 py-3 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Search</button>
              </div>
            </form>

            {featuredSnippet && !loading && (
              <div className="mb-6 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">{featuredSnippet.title}</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">{featuredSnippet.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-green-600">●</span>
                  <span>{featuredSnippet.type === 'site' ? 'Site' : 'Wiki'}</span>
                  {featuredSnippet.url && <a href={featuredSnippet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{featuredSnippet.url}</a>}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-500">Searching...</div>
            ) : (
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
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
