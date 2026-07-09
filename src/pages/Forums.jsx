import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Forums() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (forceRefresh = false) => {
    setLoading(true);
    
    // Try to get from cache first
    const { data: cached } = await supabase
      .from('forum_cache')
      .select('*')
      .eq('type', 'category')
      .order('title', { ascending: true });

    if (cached && cached.length > 0 && !forceRefresh) {
      setCategories(cached);
      setLoading(false);
      return;
    }

    // Fetch fresh data
    try {
      setRefreshing(true);
      const res = await fetch('/api/forum-scrape?action=categories');
      const data = await res.json();
      
      if (data.categories) {
        // Fetch updated cache
        const { data: fresh } = await supabase
          .from('forum_cache')
          .select('*')
          .eq('type', 'category')
          .order('title', { ascending: true });
        
        setCategories(fresh || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.content && cat.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={() => fetchCategories(true)} disabled={refreshing} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">
          {refreshing ? 'REFRESHING...' : 'REFRESH'}
        </button>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">DemocracyCraft Forums</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-6">Browse all forum categories and discussions</p>
          
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-6 py-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 animate-pulse">
                <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500 mb-4">No categories found</p>
            <button onClick={() => fetchCategories(true)} className="text-orange-500 hover:underline">
              Try refreshing
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat) => (
              <div
                key={cat.forum_id}
                onClick={() => navigate(`/forums/${cat.forum_id}`)}
                className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 hover:border-orange-500/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">{cat.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">{cat.content || 'No description available'}</p>
                    <div className="flex items-center text-xs text-orange-500 font-medium">
                      <span>View Threads</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.democracycraft.net/forums" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Original Forums
            </a>
            <a href="https://wiki.democracycraft.net/Main_Page" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Wiki
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
