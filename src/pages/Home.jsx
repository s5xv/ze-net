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
  const [stats, setStats] = useState({ totalSites: 0 });
  const [ads, setAds] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [newSites, setNewSites] = useState([]);
  const [trendingSites, setTrendingSites] = useState([]);
  const suggestionsRef = useRef(null);
  const fetchId = useRef(0);

  useEffect(() => {
    const id = ++fetchId.current;
    fetchStats(id);
    fetchFeaturedContent(id);
    fetchAds(id);
    fetchNewAndTrending(id);
    if (user) fetchBookmarks(id);
  }, [user]);

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
      const { data: siteData } = await supabase.from('sites').select('name, slug, shortcuts').eq('status', 'approved').or(`name.ilike.%${q}%,shortcuts.ilike.%${q}%`).limit(5);
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

  const fetchStats = async (id) => {
    try {
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      if (id === fetchId.current) setStats({ totalSites: count || 0 });
    } catch (e) { console.error('Stats error:', e); }
  };

  const fetchFeaturedContent = async (id) => {
    try {
      const { data: topSite, error } = await supabase
        .from('sites')
        .select('name, slug, view_count, image_url')
        .eq('status', 'approved')
        .order('view_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Top site error:', error);
        return;
      }

      if (id === fetchId.current) {
        if (topSite) {
          setFeaturedContent({
            type: 'site',
            leftLabel: 'Top Site',
            highlight: topSite.name,
            subtitle: topSite.view_count > 0
              ? `Visited ${topSite.view_count} times by the community!`
              : "The community's top-rated site!",
            actionText: 'Visit Site',
            actionLink: `/site/${topSite.slug}`,
            image_url: topSite.image_url
          });
        } else {
          setFeaturedContent({
            type: 'site',
            leftLabel: 'Featured',
            highlight: 'No sites yet',
            subtitle: 'Be the first to register!',
            actionText: 'Register Site',
            actionLink: '/register-business'
          });
        }
      }

    } catch (e) {
      console.error('Featured error:', e);
    }
  };

const fetchAds = async (id) => {
    try {
      const { data } = await supabase.from('ads').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (id === fetchId.current) setAds(data || []);
    } catch (e) { console.error('Ads error:', e); }
  };

  const fetchNewAndTrending = async (id) => {
    try {
      const [newSitesResult, trendingSitesResult] = await Promise.all([
        supabase.from('sites').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(5),
        supabase.from('sites').select('*').eq('status', 'approved').order('view_count', { ascending: false }).limit(5),
      ]);
      if (id === fetchId.current) {
        setNewSites(newSitesResult.data || []);
        setTrendingSites(trendingSitesResult.data || []);
      }
    } catch (e) { console.error('Sites error:', e); }
  };

  const fetchBookmarks = async (id) => {
    try {
      const { data } = await supabase.from('bookmarks').select('*, sites(name, slug, category)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (id === fetchId.current) setBookmarks(data || []);
    } catch (e) { console.error('Bookmarks error:', e); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'site') {
      navigate(`/site/${suggestion.slug}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
    setShowSuggestions(false);
  };

  const handleFeelingLucky = async () => {
    try {
      const { data } = await supabase.from('sites').select('slug').eq('status', 'approved').limit(1000);
      if (data && data.length > 0) {
        navigate(`/site/${data[Math.floor(Math.random() * data.length)].slug}`);
      }
    } catch (e) { console.error('Lucky error:', e); }
  };

  const fixUrl = (url, name) => {
    if (!url || url === '#') return name ? `/search?q=${encodeURIComponent(name)}` : '#';
    if (url.startsWith('/')) return url;
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const fixImgUrl = (url) => {
    if (!url) return '';
    if (url.match(/\/a\//) || url.match(/\/gallery\//)) return '';
    const m = url.match(/imgur\.com\/([a-zA-Z0-9]{5,})(?:\.[a-z]+)?(?:\?.*)?$/);
    if (m) return `https://i.imgur.com/${m[1]}.png`;
    if (url.startsWith('http')) return url;
    return '';
  };

  if (loading) {
    return (
      <Layout user={null}>
        <div className="flex-grow flex items-center justify-center text-gray-500">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow px-4 py-8 sm:py-12 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-6">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight">
                Z&E <span className="text-blue-600 dark:text-blue-400">NET</span>
              </h1>
              <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>total sites: {stats.totalSites}</span>
              </div>
            </div>

            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="What's on your mind today?..."
                className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
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
              <button onClick={handleSearch} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
                Search web
              </button>
              <button onClick={handleFeelingLucky} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
                I'm feeling lucky
              </button>
              <button onClick={() => navigate('/ask')} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
                Ask AI
              </button>
              <button onClick={() => navigate('/utilities')} className="px-6 py-2.5 bg-gray-100 dark:bg-[#303134] hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors">
                More...
              </button>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/register-business" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Register Business</a>
              <a href="/submit-ad" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Submit Ad</a>
              <a href="/verify-site" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Verify Site</a>
              <a href="/achievements" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Achievements</a>
            </div>

            <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden h-64 sm:h-80 flex bg-white dark:bg-[#303134] shadow-lg">
              <div className="w-1/2 sm:w-2/5 bg-gray-100 dark:bg-[#202124] relative p-4 border-r border-gray-300 dark:border-gray-700 overflow-hidden">
                  {featuredContent?.image_url ? (
                  <img src={fixImgUrl(featuredContent.image_url)} alt={featuredContent.highlight} className="absolute inset-0 w-full h-full object-cover object-center" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="text-center">
                    <div className="text-8xl sm:text-9xl mb-2"></div>
                    <p className="text-xs text-gray-500">{featuredContent ? featuredContent.leftLabel : 'Character'}</p>
                  </div>
                )}
              </div>
              <div className="w-1/2 sm:w-3/5 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto">
                <h2 className="text-3xl sm:text-4xl font-bold mb-2 leading-tight">Are they simply the best?!</h2>
                {featuredContent ? (
                  <>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-green-500 text-xl">✨</span>
                  New Sites
                </h3>
                <div className="space-y-3">
                  {newSites.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No new sites yet.</p>
                  ) : (
                    newSites.map((site) => (
                      <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/site/${site.slug}`); } }} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer transition-colors">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {site.name}
                          {site.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                        </h4>
                        <p className="text-xs text-gray-500">{site.category} • Added {new Date(site.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-orange-500 text-xl">🔥</span>
                  Trending This Week
                </h3>
                <div className="space-y-3">
                  {trendingSites.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No trending sites yet.</p>
                  ) : (
                    trendingSites.map((site) => (
                      <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/site/${site.slug}`); } }} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer transition-colors">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {site.name}
                          {site.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                        </h4>
                        <p className="text-xs text-gray-500">{site.category} • {site.view_count || 0} views</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        </div>

        <div className="hidden xl:block fixed top-20 left-4 xl:left-8 w-64 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
          {ads.map(ad => {
            const tierMap = { standard: 'bronze', featured: 'silver', premium: 'gold', elite: 'gold' };
            const tierStyle = tierMap[ad.tier] || 'bronze';
            return (
            <a key={ad.id} href={fixUrl(ad.link_url, ad.title)} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-4 hover:shadow-lg transition-all group border-2 ${tierStyle === 'gold' ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 border-yellow-500/50' : tierStyle === 'silver' ? 'bg-gradient-to-br from-gray-400/10 to-gray-500/10 border-gray-400/50' : 'bg-white dark:bg-[#303134] border-gray-300 dark:border-gray-700'}`}>
              <div style={{ height: '160px' }} className="w-full mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-600/20 relative flex items-center justify-center">
                {ad.image_url ? (
                  <img src={fixImgUrl(ad.image_url)} alt={ad.title} referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: '160px', width: 'auto', height: 'auto' }} className="rounded" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-gray-400 text-xs">Sponsored</span>
                )}
              </div>
              <h4 className={`font-bold mb-1 group-hover:underline ${tierStyle === 'gold' ? 'text-yellow-600 dark:text-yellow-400' : tierStyle === 'silver' ? 'text-gray-600 dark:text-gray-300' : 'text-blue-600 dark:text-blue-400'}`}>
                {ad.title}
              </h4>
              {ad.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{ad.description}</p>}
              <span className={`text-xs mt-2 block ${tierStyle === 'gold' ? 'text-yellow-500' : tierStyle === 'silver' ? 'text-gray-500' : 'text-gray-400'}`}>
                {ad.tier === 'elite' ? '👑 Elite Sponsor' : tierStyle === 'gold' ? '⭐ Gold Sponsor' : tierStyle === 'silver' ? '🥈 Silver Sponsor' : '🥉 Bronze'}
              </span>
            </a>
          );
          })}
        </div>

        <div className="hidden lg:block fixed top-20 right-4 xl:right-8 w-64 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
          {user && bookmarks.length > 0 && (
            <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                Bookmarks
              </h3>
              <div className="space-y-2">
                {bookmarks.slice(0, 5).map((bm) => (
                  <a key={bm.id} href={`/site/${bm.sites?.slug}`} className="block p-2 bg-gray-50 dark:bg-[#202124] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">
                    <h4 className="font-semibold text-xs text-blue-600 dark:text-blue-400 truncate">{bm.sites?.name}</h4>
                  </a>
                ))}
              </div>
            </div>
          )}

          {ads.filter(ad => ad.tier === 'elite').slice(0, 1).map(ad => (
            <a key={`elite-${ad.id}`} href={fixUrl(ad.link_url, ad.title)} target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-r from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 border border-yellow-500/50 rounded-xl p-3 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-2">
                {ad.image_url && <img src={fixImgUrl(ad.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover border border-yellow-500/30" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">👑 Elite Sponsor</span>
                  <h4 className="font-semibold text-sm group-hover:underline truncate text-yellow-600 dark:text-yellow-400">{ad.title}</h4>
                </div>
              </div>
            </a>
          ))}

          {ads.filter(ad => ad.tier === 'featured' || ad.tier === 'premium' || ad.tier === 'elite').length > 0 && (
            <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Featured Ads</h3>
              <div className="space-y-2">
                {ads.filter(ad => ad.tier === 'featured' || ad.tier === 'premium' || ad.tier === 'elite').map(ad => (
                  <a key={`fa-${ad.id}`} href={fixUrl(ad.link_url, ad.title)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-[#202124] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors group">
                    {ad.image_url && <img src={fixImgUrl(ad.image_url, 80, 80)} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold group-hover:underline truncate">{ad.title}</h4>
                      <span className="text-[10px] text-gray-500">{ad.tier === 'elite' ? '👑 Elite' : ad.tier === 'premium' ? '⭐ Premium' : '🥈 Featured'}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
