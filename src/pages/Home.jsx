import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topSearches, setTopSearches] = useState([]);
  const { isDark } = useTheme();
  const [stats, setStats] = useState({ onlinePlayers: 0, totalSites: 0 });
  const suggestionsRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchTopSearches();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (q.length < 1) {
      setSuggestions(topSearches.map(t => ({ type: 'popular', text: t.query })));
      setShowSuggestions(topSearches.length > 0);
      return;
    }

    const fetchSuggestions = async () => {
      const { data: siteData } = await supabase
        .from('sites')
        .select('name, slug, shortcuts')
        .or(`name.ilike.%${q}%,shortcuts.ilike.%${q}%`)
        .limit(5);

      const { data: wikiData } = await supabase
        .from('wiki_pages')
        .select('title')
        .ilike('title', `%${q}%`)
        .limit(3);

      const combined = [
        ...(siteData || []).map(s => ({ type: 'site', text: s.name, slug: s.slug, shortcuts: s.shortcuts })),
        ...(wikiData || []).map(w => ({ type: 'wiki', text: w.title }))
      ].sort((a, b) => a.text.localeCompare(b.text)).slice(0, 8);

      setSuggestions(combined);
      setShowSuggestions(combined.length > 0);
    };

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [q, topSearches]);

  const fetchStats = async () => {
    try {
      const res = await fetch('https://map.democracycraft.net/maps/reveille/live/players.json');
      const data = await res.json();
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      setStats({ onlinePlayers: data.players?.length || 0, totalSites: count || 0 });
    } catch (err) { console.error(err); }
  };

  const fetchTopSearches = async () => {
    const { data } = await supabase
      .from('search_analytics')
      .select('query')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);
    
    if (data) {
      const counts = {};
      data.forEach(item => { counts[item.query] = (counts[item.query] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([query]) => ({ query }));
      setTopSearches(top);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'site') navigate(`/site/${suggestion.slug}`);
    else if (suggestion.type === 'popular') navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    else navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    setShowSuggestions(false);
  };

  const handleFeelingLucky = async () => {
    const { data } = await supabase.from('sites').select('slug').limit(1000);
    if (data?.length) {
      const randomSite = data[Math.floor(Math.random() * data.length)];
      navigate(`/site/${randomSite.slug}`);
    }
  };

  const handleMoreClick = () => {
    navigate('/utilities');
  };

  return (
    <Layout user={user}>
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* MASSIVE LOGO */}
        <div className="text-center mb-6">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight">
            Z&E <span className="text-blue-600 dark:text-blue-400">NET</span>
          </h1>
          <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>players online: {stats.onlinePlayers}</span>
            <span>•</span>
            <span>total sites: {stats.totalSites}</span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6 relative">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="What's on your mind today?..."
            className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          
          {showSuggestions && (
            <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionClick(s)} className="w-full text-left px-6 py-3 hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                  {s.type === 'popular' ? (
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  )}
                  <span className="text-gray-700 dark:text-gray-300 flex-grow">{s.text}</span>
                  {s.type === 'popular' && <span className="text-xs text-orange-500">Trending</span>}
                  {s.type === 'site' && <span className="text-xs text-gray-400">Site</span>}
                  {s.type === 'wiki' && <span className="text-xs text-gray-400">Wiki</span>}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* BUTTONS */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <button onClick={handleSearch} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            Search web
          </button>
          <button onClick={handleFeelingLucky} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            I'm feeling lucky
          </button>
          <button onClick={handleMoreClick} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
            More...
          </button>
        </div>

        {/* "ARE THEY SIMPLY THE BEST?!" SECTION */}
        <div className="w-full max-w-4xl mb-8">
          <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden h-64 sm:h-80 flex bg-white dark:bg-[#303134] shadow-lg">
            <div className="w-1/2 sm:w-2/5 bg-gray-100 dark:bg-[#202124] flex items-center justify-center p-4 border-r border-gray-300 dark:border-gray-700">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl mb-2"></div>
                <p className="text-xs text-gray-500">Character</p>
              </div>
            </div>
            <div className="w-1/2 sm:w-3/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">Are they simply the best?!</h2>
                <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-6">Are placeholders simply better?</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 italic">(This will show most searched site/wiki/person this week once people start browsing!)</p>
              </div>
              <div className="h-6 w-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 rounded-full mt-auto"></div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
