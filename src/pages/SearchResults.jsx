import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      // Query text fields
      const { data: textResults } = await supabase
        .from('listings')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(30);

      // Query array fields (search aliases)
      const { data: aliasResults } = await supabase
        .from('listings')
        .select('*')
        .contains('search_aliases', [query])
        .limit(30);

      // Combine and deduplicate
      const combined = [...(textResults || []), ...(aliasResults || [])];
      const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());

      // Sort: Sponsored first, then Verified, then alphabetical
      uniqueResults.sort((a, b) => {
        if (b.is_sponsored !== a.is_sponsored) return b.is_sponsored - a.is_sponsored;
        if (b.is_verified !== a.is_verified) return b.is_verified - a.is_verified;
        return a.name.localeCompare(b.name);
      });

      setResults(uniqueResults);
      setLoading(false);
    };
    fetchResults();
  }, [query]);

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const q = formData.get('q');
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Premium Dark Header */}
      <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex items-center">
        <Link to="/" className="text-2xl font-bold text-white mr-8 tracking-tight">
          Z&E <span className="text-blue-500">Net</span>
        </Link>
        <form onSubmit={handleHeaderSearch} className="flex-grow max-w-2xl">
           <input 
             type="text" 
             name="q"
             defaultValue={query} 
             className="w-full px-5 py-2.5 rounded-full bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
             placeholder="Search directory..."
           />
        </form>
      </header>

      {/* Results Body */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-8">
          {loading ? 'Querying network...' : `Found ${results.length} results for "${query}"`}
        </p>
        
        {results.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No matching entries found in the directory.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your search terms or check the spelling.</p>
          </div>
        )}

        <div className="space-y-4">
          {results.map((item) => (
            <div 
              key={item.id} 
              className={`p-6 rounded-xl border transition-all hover:translate-y-[-2px] ${
                item.is_sponsored 
                  ? 'bg-gray-900 border-amber-500/30 shadow-lg shadow-amber-900/5' 
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {item.icon_url ? (
                    <img src={item.icon_url} alt="" className="w-10 h-10 rounded-lg bg-gray-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 font-bold">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      {item.is_verified && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {item.target_url || `zenet.vercel.app/${item.slug}`}
                    </span>
                  </div>
                </div>

                {/* Monetization Badges */}
                <div className="flex items-center gap-2">
                  {item.is_sponsored && (
                    <span className="px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full uppercase tracking-wider">
                      Sponsored
                    </span>
                  )}
                  <span className="px-3 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                    {item.category}
                  </span>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.description}</p>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Operated by: <span className="text-gray-400 font-medium">{item.owner_name || 'Unknown'}</span></span>
                <Link 
                  to={`/${item.slug}`} 
                  className="px-4 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full hover:bg-blue-600/20 transition-colors font-medium"
                >
                  Visit Shortlink
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
