import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Footer from '../components/Footer';

export default function Search({ user }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const verifiedFilter = searchParams.get('verified') === 'true';
  const sponsoredFilter = searchParams.get('sponsored') === 'true';
  const sortBy = searchParams.get('sort') || 'view_count';

  const [q, setQ] = useState(query);
  const [siteResults, setSiteResults] = useState([]);
  const [wikiResults, setWikiResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (query || categoryFilter || verifiedFilter || sponsoredFilter) {
      fetchResults();
    }
  }, [query, categoryFilter, verifiedFilter, sponsoredFilter, sortBy]);

  const fetchResults = async () => {
    setLoading(true);
    
    let queryBuilder = supabase.from('sites').select('*');

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (categoryFilter) {
      queryBuilder = queryBuilder.eq('category', categoryFilter);
    }

    if (verifiedFilter) {
      queryBuilder = queryBuilder.eq('is_verified', true);
    }

    if (sponsoredFilter) {
      queryBuilder = queryBuilder.eq('is_sponsored', true);
    }

    if (sortBy === 'view_count') {
      queryBuilder = queryBuilder.order('view_count', { ascending: false });
    } else if (sortBy === 'created_at') {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    } else if (sortBy === 'name') {
      queryBuilder = queryBuilder.order('name', { ascending: true });
    }

    const { data: sitesData } = await queryBuilder;
    setSiteResults(sitesData || []);

    let wikiQueryBuilder = supabase.from('wiki_pages').select('*');
    if (query) {
      wikiQueryBuilder = wikiQueryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    }

    const { data: wikiData } = await wikiQueryBuilder.order('title', { ascending: true }).limit(50);
    setWikiResults(wikiData || []);

    await supabase.from('search_analytics').insert({
      query: query,
      user_id: user?.id || null,
      results_count: (sitesData?.length || 0) + (wikiData?.length || 0)
    });

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      const params = new URLSearchParams(searchParams);
      params.set('q', q.trim());
      navigate(`/search?${params.toString()}`);
    }
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate(`/search?${params.toString()}`);
  };

  const categories = ['Government', 'Corporate', 'Service', 'Charity', 'Community', 'Business', 'Build Project', 'Event', 'Politics', 'Creative', 'Emergency', 'Other'];
  const totalResults = siteResults.length + wikiResults.length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="bg-white dark:bg-[#111111] border-b border-neutral-200 dark:border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <a href="/" className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">Z&E <span className="text-orange-500">Net</span></span>
          </a>
          
          <form onSubmit={handleSearch} className="flex-grow w-full sm:w-auto">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sites and wiki..."
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </form>

          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            {user ? (
              <a href="/account" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
            ) : (
              <a href="/login" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN IN</a>
            )}
            <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg text-sm font-medium hover:border-orange-500/50 transition-colors"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {showFilters && (
            <div className="mt-4 p-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedFilter}
                    onChange={(e) => updateFilter('verified', e.target.checked ? 'true' : '')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Verified only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sponsoredFilter}
                    onChange={(e) => updateFilter('sponsored', e.target.checked ? 'true' : '')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Sponsored only</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="view_count">Most Popular</option>
                  <option value="created_at">Newest</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Search Results</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {loading ? 'Searching...' : `${totalResults} results for "${query}" (${siteResults.length} sites, ${wikiResults.length} wiki pages)`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl animate-pulse">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-3"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500">No results found</p>
          </div>
        ) : (
          <>
            {siteResults.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-3 text-orange-500">Sites ({siteResults.length})</h3>
                <div className="space-y-3">
                  {siteResults.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 sm:p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl hover:border-orange-500/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/site/${item.slug}`)}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{item.name}</h3>
                        {item.is_verified && <span className="text-xs text-orange-500">✓</span>}
                        {item.is_sponsored && <span className="px-2 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded uppercase tracking-wider">Sponsored</span>}
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{item.description}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 font-mono flex-wrap">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{item.owner_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{item.view_count || 0} views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wikiResults.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3 text-orange-500">Wiki Pages ({wikiResults.length})</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {wikiResults.map((page) => (
                    <a
                      key={page.id}
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl hover:border-orange-500/30 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-semibold group-hover:text-orange-500 transition-colors truncate">{page.title}</h4>
                          {page.category && page.category !== 'Category' && (
                            <p className="text-xs text-neutral-500 font-mono mt-1">{page.category}</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
