import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
      
      // 1. Search standard text fields (name and description)
      const { data: textResults, error: textError } = await supabase
        .from('listings')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);

      // 2. Search the array field (search_aliases) using the contains operator
      const { data: aliasResults, error: aliasError } = await supabase
        .from('listings')
        .select('*')
        .contains('search_aliases', [query])
        .limit(20);

      // Combine and deduplicate results
      const combined = [...(textResults || []), ...(aliasResults || [])];
      const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());

      // Sort: Sponsored first, then Verified
      uniqueResults.sort((a, b) => {
        if (b.is_sponsored !== a.is_sponsored) return b.is_sponsored - a.is_sponsored;
        return b.is_verified - a.is_verified;
      });

      if (!textError && !aliasError) setResults(uniqueResults);
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center">
        <Link to="/" className="text-2xl font-bold text-gray-800 mr-8">
          Z&E <span className="text-blue-600">Net</span>
        </Link>
        <form onSubmit={handleHeaderSearch} className="flex-grow max-w-2xl">
           <input 
             type="text" 
             name="q"
             defaultValue={query} 
             className="w-full px-5 py-2 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:shadow-md"
             placeholder="Search..."
           />
        </form>
      </header>

      {/* Results Body */}
      <main className="max-w-3xl px-6 py-6">
        <p className="text-sm text-gray-500 mb-6">
          {loading ? 'Searching...' : `About ${results.length} results for "${query}"`}
        </p>
        
        {results.length === 0 && !loading && (
          <p className="text-gray-600">No results found. Try a different search term or check the spelling.</p>
        )}

        {results.map((item) => (
          <div key={item.id} className="mb-6 max-w-xl">
            <div className="flex items-center mb-1">
              {item.icon_url && <img src={item.icon_url} alt="" className="w-6 h-6 rounded-full mr-2" />}
              <span className="text-sm text-gray-600 truncate">
                {item.target_url || `zenet.vercel.app/${item.slug}`}
              </span>
              {item.is_verified && <span className="ml-2 text-blue-500 text-xs font-bold">✓ Verified</span>}
            </div>
            <Link to={`/${item.slug}`} className="text-xl text-blue-700 hover:underline font-medium block">
              {item.name}
            </Link>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
