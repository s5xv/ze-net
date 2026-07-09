import SiteReviews from '../components/SiteReviews';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Footer from '../components/Footer';

export default function Site({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedSites, setRelatedSites] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    fetchSite();
  }, [slug]);

  const fetchSite = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    
    if (data) {
      setSite(data);
      
      const stored = localStorage.getItem('recentlyViewed');
      const recentlyViewed = stored ? JSON.parse(stored) : [];
      const updated = [data, ...recentlyViewed.filter((s) => s.id !== data.id)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      
      await supabase.from('sites').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
      
      const { data: related } = await supabase
        .from('sites')
        .select('*')
        .eq('category', data.category)
        .neq('id', data.id)
        .limit(5);
      setRelatedSites(related || []);

      if (user) {
        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('site_id', data.id)
          .single();
        setIsBookmarked(!!bookmark);
      }
    }
    
    setLoading(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleBookmark = async () => {
    if (!user) {
      alert('Please sign in to bookmark sites');
      return;
    }

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('site_id', site.id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, site_id: site.id });
      setIsBookmarked(true);
    }
  };

  const getAllUrls = () => {
    if (site.urls && site.urls.length > 0) {
      return site.urls;
    }
    if (site.url) {
      return [{ label: 'Website', url: site.url }];
    }
    return [];
  };

  const handleVisit = async (urlObj) => {
    if (site) {
      await supabase.from('sites').update({ click_count: (site.click_count || 0) + 1 }).eq('id', site.id);
      window.open(urlObj.url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-neutral-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-neutral-500">Site not found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-orange-500 hover:underline">Go Home</button>
        </div>
      </div>
    );
  }

  const urls = getAllUrls();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        {user ? (
          <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>
        ) : (
          <a href="/login" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">SIGN IN</a>
        )}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#111111] rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-white/5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold">{site.name}</h1>
                {site.is_verified && <span className="px-2 py-1 text-xs font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded">✓ Verified</span>}
                {site.is_sponsored && <span className="px-2 py-1 text-xs font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded">SPONSORED</span>}
              </div>
              <p className="text-sm text-neutral-500 font-mono mb-2">{site.category}</p>
              {site.owner_name && <p className="text-sm text-neutral-500">Owner: {site.owner_name}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <button onClick={handleBookmark} className={`px-4 py-2 sm:py-3 font-medium rounded-lg transition-colors text-sm sm:text-base ${
                isBookmarked 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}>
                {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
              </button>
              <button onClick={handleShare} className="px-4 py-2 sm:py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg transition-colors text-sm sm:text-base">
                Share
              </button>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">{site.description}</p>
          </div>

          {urls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Links</h3>
              <div className="flex flex-wrap gap-2">
                {urls.map((urlObj, index) => (
                  <button
                    key={index}
                    onClick={() => handleVisit(urlObj)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <span>{urlObj.label}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-neutral-200 dark:border-white/10 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-500">{site.view_count || 0}</p>
              <p className="text-xs sm:text-sm text-neutral-500">Views</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-500">{site.click_count || 0}</p>
              <p className="text-xs sm:text-sm text-neutral-500">Clicks</p>
            </div>
          </div>
        </div>

        {relatedSites.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4">Related Sites</h2>
            <div className="space-y-3">
              {relatedSites.map((related) => (
                <div 
                  key={related.id} 
                  className="p-4 bg-neutral-50 dark:bg-[#09090b] border border-neutral-200 dark:border-white/5 rounded-lg hover:border-orange-500/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/site/${related.slug}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{related.name}</h3>
                    {related.is_verified && <span className="text-xs text-orange-500">✓</span>}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{related.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <SiteReviews siteId={site.id} user={user} />
      </main>

      <Footer />
    </div>
  );
}
