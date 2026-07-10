import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topSearches, setTopSearches] = useState([]);
  const [featuredContent, setFeaturedContent] = useState(null);
  const { isDark } = useTheme();
  const [stats, setStats] = useState({ onlinePlayers: 0, totalSites: 0 });
  const [ads, setAds] = useState([]);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchFeaturedContent();
    fetchAds();
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
      const { data: siteData } = await supabase.from('sites').select('name, slug, shortcuts').or(`name.ilike.%${q}%,shortcuts.ilike.%${q}%`).limit(5);
      const { data: wikiData } = await supabase.from('wiki_pages').select('title').ilike('title', `%${q}%`).limit(3);
      const combined = [
        ...(siteData || []).map(s => ({ type: 'site', text: s.name, slug: s.slug })),
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
      const res = await fetch('/api?endpoint=online-players');
      const data = await res.json();
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true });
      setStats({ onlinePlayers: data.players?.length || 0, totalSites: count || 0 });
    } catch (err) { console.error(err); }
  };

  const fetchFeaturedContent = async () => {
    // 1. Try to get most searched term this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: searchData } = await supabase.from('search_analytics').select('query').gte('created_at', oneWeekAgo);
    
    if (searchData && searchData.length > 0) {
      const counts = {};
      searchData.forEach(item => { counts[item.query] = (counts[item.query] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      
      if (sorted.length > 0) {
        setTopSearches(sorted.slice(0, 5).map(([query]) => ({ query })));
        setFeaturedContent({
          type: 'search',
          leftLabel: 'Trending',
          highlight: sorted[0][0],
          subtitle: `Searched ${sorted[0][1]} times in the last 7 days!`,
          actionText: 'Search it now',
          actionLink: `/search?q=${encodeURIComponent(sorted[0][0])}`
        });
        return;
      }
    }

    // 2. Fallback: Most visited site
    const { data: topSite } = await supabase.from('sites').select('name, slug, view_count').order('view_count', { ascending: false }).limit(1).single();
    if (topSite && topSite.view_count > 0) {
      setFeaturedContent({
        type: 'site',
        leftLabel: 'Top Site',
        highlight: topSite.name,
        subtitle: `Visited ${topSite.view_count} times by the community!`,
        actionText: 'Visit Site',
        actionLink: `/site/${topSite.slug}`
      });
      return;
    }

    // 3. Fallback: Any wiki page
    const { data: topWiki } = await supabase.from('wiki_pages').select('title, url').limit(1).single();
    if (topWiki) {
      setFeaturedContent({
        type: 'wiki',
        leftLabel: 'Wiki',
        highlight: topWiki.title,
        subtitle: 'Explore the DemocracyCraft wiki!',
        actionText: 'Read Wiki',
        actionLink: topWiki.url,
        external: true
      });
      return;
    }

    // 4. Absolute fallback
    setFeaturedContent(null);
  };

  const fetchAds = async () => {
    const { data } = await supabase.from('ads').select('*').eq('is_active', true).order('created_at', { ascending: false });
    setAds(data || []);
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
    else navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    setShowSuggestions(false);
  };

  const handleFeelingLucky = async () => {
    const { data } = await supabase.from('sites').select('slug').limit(1000);
    if (data && data.length > 0) {
      navigate(`/site/${data[Math.floor(Math.random() * data.length)].slug}`);
      return;
    }
    const { data: wikiPages } = await supabase.from('wiki_pages').select('url').not('content', 'is', null).limit(1000);
    if (wikiPages && wikiPages.length > 0) {
      window.open(wikiPages[Math.floor(Math.random() * wikiPages.length)].url, '_blank');
    }
  };

  const fixUrl = (url) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  if (loading) return <Layout user={null}><div className="flex-grow flex items-center justify-center text-gray-500">Loading...</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 sm:py-12 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-6">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight">
              Z&E <span className="text-blue-600 dark:text-blue-400">NET</span>
            </h1>
            <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>players online: {stats.onlinePlayers}</span>
              <span>•</span>
              <span>total sites: {stats.totalSites}</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="w-full relative">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} placeholder="What's on your mind today?..." className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            {showSuggestions && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => handleSuggestionClick(s)} className="w-full text-left px-6 py-3 hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-gray-700 dark:text-gray-300 flex-grow">{s.text}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={handleSearch} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">Search web</button>
            <button onClick={handleFeelingLucky} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">I'm feeling lucky</button>
            <button onClick={() => navigate('/utilities')} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">More...</button>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register-business" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Register Business</a>
            <a href="/submit-ad" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Submit Ad</a>
            <a href="/verify-site" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Verify Site</a>
            <a href="/wiki" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Wiki</a>
            <a href="/departments" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Departments</a>
            <a href="/achievements" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Achievements</a>
          </div>

          {/* UPDATED FEATURED CARD */}
          <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden h-64 sm:h-80 flex bg-white dark:bg-[#303134] shadow-lg">
            <div className="w-1/2 sm:w-2/5 bg-gray-100 dark:bg-[#202124] flex items-center justify-center p-4 border-r border-gray-300 dark:border-gray-700">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl mb-2"></div>
                <p className="text-xs text-gray-500">{featuredContent ? featuredContent.leftLabel : 'Character'}</p>
              </div>
            </div>
            <div className="w-1/2 sm:w-3/5 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto">
              {/* Main Title Always Shows */}
              <h2 className="text-3xl sm:text-4xl font-bold mb-2 leading-tight">Are they simply the best?!</h2>
              
              {featuredContent ? (
                <>
                  {/* Dynamic Subtitle in smaller font */}
                  <p className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 font-medium mb-2">
                    {featuredContent.type === 'site' ? 'Featured Site: ' : featuredContent.type === 'wiki' ? 'Featured Wiki: ' : 'Top Searched: '}
                    <span className="text-gray-800 dark:text-gray-100">{featuredContent.highlight}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4">{featuredContent.subtitle}</p>
                  <button 
                    onClick={() => featuredContent.external ? window.open(featuredContent.actionLink, '_blank') : navigate(featuredContent.actionLink)} 
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium w-fit"
                  >
                    {featuredContent.actionText}
                  </button>
                </>
              ) : (
                <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-6">Are placeholders simply better?</p>
              )}
              
              <div className="h-6 w-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 rounded-full mt-auto"></div>
            </div>
          </div>
        </div>

        {/* Ads Section */}
        {ads.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sponsored</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <a key={ad.id} href={fixUrl(ad.link_url)} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-4 hover:shadow-lg transition-all group border-2 ${ad.tier === 'gold' ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 border-yellow-500/50' : ad.tier === 'silver' ? 'bg-gradient-to-br from-gray-400/10 to-gray-500/10 border-gray-400/50' : 'bg-white dark:bg-[#303134] border-gray-300 dark:border-gray-700'}`}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-lg mb-3" onError={(e) => e.target.style.display = 'none'} />}
                  <h4 className={`font-bold mb-1 group-hover:underline ${ad.tier === 'gold' ? 'text-yellow-600 dark:text-yellow-400' : ad.tier === 'silver' ? 'text-gray-600 dark:text-gray-300' : 'text-blue-600 dark:text-blue-400'}`}>{ad.title}</h4>
                  {ad.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{ad.description}</p>}
                  <span className={`text-xs mt-2 block ${ad.tier === 'gold' ? 'text-yellow-500' : ad.tier === 'silver' ? 'text-gray-500' : 'text-gray-400'}`}>{ad.tier === 'gold' ? '⭐ Gold Sponsor' : ad.tier === 'silver' ? '🥈 Silver Sponsor' : '🥉 Bronze'}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
