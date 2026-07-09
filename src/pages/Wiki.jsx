import Footer from '../components/Footer';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { supabase } from './services/supabase';

export default function Wiki() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    setLoading(true);
    
    // Fetch pages from cache
    const { data: pagesData } = await supabase
      .from('wiki_pages')
      .select('*')
      .neq('category', 'Category')
      .order('title', { ascending: true });
    
    setPages(pagesData || []);

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('category', 'Category')
      .order('title', { ascending: true });
    
    setCategories(categoriesData || []);
    setLoading(false);
  };

  const syncWiki = async () => {
    setSyncing(true);
    try {
      // Sync all pages
      await fetch('/api/wiki-scrape?action=all-pages');
      // Sync categories
      await fetch('/api/wiki-scrape?action=categories');
      // Refresh data
      await fetchWikiData();
      alert('Wiki synced successfully!');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(pages.map(p => p.category).filter(c => c && c !== 'Category'))];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={syncWiki} disabled={syncing} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">
          {syncing ? 'SYNCING...' : 'SYNC WIKI'}
        </button>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">DemocracyCraft Wiki</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-6">
            {pages.length} pages • {categories.length} categories
          </p>
          
          <div className="max-w-xl mx-auto mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wiki pages..."
              className="w-full px-6 py-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {uniqueCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                All
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 animate-pulse">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-3"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500 mb-4">No pages found</p>
            <button onClick={syncWiki} disabled={syncing} className="text-orange-500 hover:underline">
              {syncing ? 'Syncing...' : 'Sync wiki to load pages'}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map((page) => (
              <a
                key={page.id}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 hover:border-orange-500/50 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-orange-500 transition-colors">{page.title}</h3>
                    {page.category && page.category !== 'Category' && (
                      <span className="text-xs text-neutral-500 font-mono">{page.category}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Categories</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={cat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white dark:bg-[#111111] rounded-xl p-4 border border-neutral-200 dark:border-white/5 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-medium">{cat.title}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a href="https://wiki.democracycraft.net/Main_Page" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Wiki Main Page
            </a>
            <a href="https://www.democracycraft.net/forums" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Forums
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
