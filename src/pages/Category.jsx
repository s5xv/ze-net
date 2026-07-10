import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';

export default function Category() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [category]);

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('category', category)
      .order('is_sponsored', { ascending: false })
      .order('is_verified', { ascending: false });
    
    setListings(data || []);
    setLoading(false);
  };

  const categoryColors = {
    Government: 'text-blue-500',
    Corporate: 'text-purple-500',
    Service: 'text-green-500'
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex justify-end gap-4 px-6 py-4">
        <a href="/" className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${categoryColors[category] || 'text-orange-500'}`}>{category}</h1>
          <p className="text-neutral-500">Browse all {category.toLowerCase()} listings on DemocracyCraft</p>
        </div>

        {loading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-400">No listings found in this category.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((item) => (
              <div key={item.id} className="p-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl hover:border-orange-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/${item.slug}`)}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{item.name}</h3>
                  {item.is_verified && <span className="text-xs text-orange-500">✓</span>}
                  {item.is_sponsored && <span className="px-2 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded uppercase tracking-wider">Sponsored</span>}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{item.description}</p>
                <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>Owner: {item.owner_name || 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
