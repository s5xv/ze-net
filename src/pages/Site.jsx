import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/useRealtime';
import { apiFetch } from '../services/api';

function renderRichText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|_.*?_|~~.*?~~|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <s key={i}>{part.slice(2, -2)}</s>;
    const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{linkMatch[1]}</a>;
    return part;
  });
}

export default function Site() {
  const { user } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [relatedSites, setRelatedSites] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [newComment, setNewComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(1);
  const [userBalance, setUserBalance] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewFilter, setReviewFilter] = useState(0);
  const [reviewVotes, setReviewVotes] = useState({});
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');

  useEffect(() => { fetchSite(); }, [slug, user]);
  usePolling(async () => {
    if (!site?.id) return;
    try {
      const { data: c } = await supabase.from('site_comments').select('*, user:user_id(username)').eq('site_id', site.id).order('created_at', { ascending: false });
      if (c) setComments(c);
      const { data: r } = await supabase.from('site_reviews').select('*, user:user_id(username)').eq('site_id', site.id).order('created_at', { ascending: false });
      if (r) setReviews(r);
    } catch (e) { console.error('Polling error:', e); }
  }, 10000, !!site?.id);

  const fetchSite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      
      setSite(data);
      apiAction('record-view', { siteId: data.id }).catch(e => console.error('View recording:', e));
      
      if (user) {
        const { data: bookmark } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('site_id', data.id).maybeSingle();
        setIsBookmarked(!!bookmark);
        const { data: follow } = await supabase.from('site_followers').select('id').eq('user_id', user.id).eq('site_id', data.id).maybeSingle();
        setIsFollowing(!!follow);
        const { data: upvote } = await supabase.from('site_upvotes').select('id').eq('user_id', user.id).eq('site_id', data.id).maybeSingle();
        setHasUpvoted(!!upvote);
        const { data: balData } = await supabase.from('balances').select('balance').eq('user_id', user.id).maybeSingle();
        setUserBalance(balData?.balance || 0);
      }

      const { count } = await supabase.from('site_upvotes').select('*', { count: 'exact', head: true }).eq('site_id', data.id);
      setUpvotes(count || 0);

      apiAction('get-site-data', { slug: data.slug })
        .then(r => { setReviews(r.reviews || []); setComments(r.comments || []); setAnnouncements(r.announcements || []); })
        .catch(e => console.error('Site data fetch:', e));

      const { data: evData } = await supabase.from('site_events').select('*').eq('site_id', data.id).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(10);
      setEvents(evData || []);

      const { data: cpData } = await supabase.from('site_coupons').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
      setCoupons(cpData || []);

      const { data: relData } = await supabase.from('sites').select('slug, name, image_url, view_count').eq('category', data.category).neq('id', data.id).order('view_count', { ascending: false }).limit(4);
      setRelatedSites(relData || []);

      if (user) {
        const { data: votes } = await supabase.from('review_votes').select('review_id, vote_type').in('review_id', reviews.map(r => r.id));
        if (votes) {
          const vMap = {};
          votes.forEach(v => { vMap[v.review_id] = v.vote_type; });
          setReviewVotes(vMap);
        }
      }
    } catch (e) { console.error('Error fetching site:', e); }
    setLoading(false);
  };

  const toggleBookmark = async () => {
    if (!user || !site?.id) return;
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('site_id', site.id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, site_id: site.id });
      setIsBookmarked(true);
    }
  };

  const toggleFollow = async () => {
    if (!user || !site?.id) return;
    if (isFollowing) {
      await supabase.from('site_followers').delete().eq('user_id', user.id).eq('site_id', site.id);
      setIsFollowing(false);
    } else {
      await supabase.from('site_followers').insert({ user_id: user.id, site_id: site.id });
      setIsFollowing(true);
    }
  };

  const apiAction = (action, body) => apiFetch('/api/app?action=' + action, { method: 'POST', body: JSON.stringify(body) });

  const handleUpvote = async () => {
    if (!user || !site?.id) return;
    await apiAction('toggle-upvote', { siteId: site.id, remove: hasUpvoted });
    setHasUpvoted(!hasUpvoted);
    setUpvotes(u => hasUpvoted ? u - 1 : u + 1);
  };

  const submitReview = async () => {
    if (!user || !site?.id || !newReview.comment.trim()) return;
    try {
      await apiAction('submit-review', { siteId: site.id, rating: newReview.rating, comment: newReview.comment });
      setNewReview({ rating: 5, comment: '' });
      fetchSite();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const submitComment = async () => {
    if (!user || !site?.id || !newComment.trim()) return;
    try {
      await apiAction('submit-comment', { siteId: site.id, comment: newComment });
      setNewComment('');
      fetchSite();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const submitReport = async () => {
    if (!user || !site?.id || !reportReason.trim()) return;
    try {
      await apiAction('submit-report', { siteId: site.id, reason: reportReason });
      setShowReportModal(false);
      setReportReason('');
      alert('Report submitted');
    } catch (e) { alert('Error: ' + e.message); }
  };

  const submitTip = async () => {
    if (!user || !site?.id || !site?.user_id) return;
    if (userBalance < tipAmount) { alert('Insufficient balance'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Please sign in again before tipping.'); return; }
      const data = await apiFetch('/api/app?action=tip', {
        method: 'POST', body: JSON.stringify({ targetUserId: site.user_id, amount: tipAmount })
      });
      if (data.error) throw new Error(data.error);
      setUserBalance(prev => prev - tipAmount);
      setShowTipModal(false);
      alert('Tip sent!');
    } catch (err) {
      alert('Tip failed: ' + err.message + (err.message === 'Authentication required' ? ' — please sign out and back in.' : ''));
    }
  };

  const handleReviewVote = async (reviewId, voteType) => {
    if (!user) return;
    const existing = reviewVotes[reviewId];
    if (existing === voteType) {
      await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
      setReviewVotes(prev => { const n = {...prev}; delete n[reviewId]; return n; });
    } else {
      if (existing) await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
      await supabase.from('review_votes').insert({ review_id: reviewId, user_id: user.id, vote_type: voteType });
      setReviewVotes(prev => ({...prev, [reviewId]: voteType }));
    }
  };

  const handleMergeRequest = async () => {
    if (!mergeTarget.trim()) return;
    const { data: target } = await supabase.from('sites').select('id').eq('slug', mergeTarget.trim()).maybeSingle();
    if (!target || target.id === site.id) { alert('Site not found or same site'); return; }
    await supabase.from('merge_requests').insert({ from_site_id: site.id, to_site_id: target.id, created_by: user.id });
    alert('Merge request submitted for admin review');
    setShowMergeModal(false);
    setMergeTarget('');
  };

  let displayedReviews = [...reviews];
  if (reviewFilter > 0) displayedReviews = displayedReviews.filter(r => r.rating === reviewFilter);
  if (reviewSort === 'newest') displayedReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (reviewSort === 'oldest') displayedReviews.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else if (reviewSort === 'highest') displayedReviews.sort((a, b) => b.rating - a.rating);
  else if (reviewSort === 'lowest') displayedReviews.sort((a, b) => a.rating - b.rating);

  if (loading) {
    return <Layout user={user}><div className="min-h-screen flex items-center justify-center text-white">Loading site...</div></Layout>;
  }
  if (!site) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">Site not found</div>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Go Home</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8">
        {site.customization?.banner_url && (
          <div className="mb-4 -mx-4 sm:-mx-6">
            <img src={site.customization.banner_url} alt="" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
          </div>
        )}

        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8" style={site.customization?.accent_color ? { borderColor: site.customization.accent_color } : {}}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {site.image_url && <img src={site.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-600" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />}
              <h1 className="text-3xl font-bold text-white">{site.name}</h1>
              {site.is_verified && <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">VERIFIED</span>}
              {site.customization?.status && (
                <span className={`px-3 py-1 text-xs rounded-full font-bold text-white ${
                  site.customization.status === 'open' ? 'bg-green-600' :
                  site.customization.status === 'closed' ? 'bg-red-600' :
                  site.customization.status === 'busy' ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {site.customization.status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={toggleBookmark} className={`px-3 py-2 rounded-lg text-sm ${isBookmarked ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
              <button onClick={toggleFollow} className={`px-3 py-2 rounded-lg text-sm ${isFollowing ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button onClick={handleUpvote} className={`px-3 py-2 rounded-lg text-sm ${hasUpvoted ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {hasUpvoted ? 'Upvoted' : 'Upvote'} ({upvotes})
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">Description</p>
              <p className="text-gray-300 text-lg">{renderRichText(site.description)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {site.discord_invite && site.url ? (
                <div className="flex gap-2">
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">Visit Website</a>
                  <a href={site.discord_invite} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold">Join Discord</a>
                </div>
              ) : site.discord_invite ? (
                <a href={site.discord_invite} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold">Join Discord</a>
              ) : (
                <a href={site.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">Visit Site</a>
              )}
              <button onClick={() => setShowQR(true)} className="px-4 py-3 bg-gray-700 text-white rounded-lg font-bold text-sm">QR</button>
              {user && site.user_id && user.id !== site.user_id && (
                <button onClick={() => setShowTipModal(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold">Tip Owner</button>
              )}
              {user && (site.owner_user_id === user.id || site.user_id === user.id) && (
                <>
                  <a href={`/site/${slug}/manage`} className="px-4 py-3 bg-yellow-600 text-white rounded-lg font-bold text-sm">Manage</a>
                  <a href={`/site/${slug}/analytics`} className="px-4 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm">Analytics</a>
                </>
              )}
              {user && user.id !== site.user_id && (
                <button onClick={() => setShowMergeModal(true)} className="px-4 py-3 bg-pink-700 text-white rounded-lg font-bold text-sm">Suggest Merge</button>
              )}
              <button onClick={() => setShowReportModal(true)} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold">Report</button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700">
              <div><p className="text-sm text-gray-400">Category</p><p className="text-white capitalize">{site.category}{site.subcategory ? ' / ' + site.subcategory : ''}</p></div>
              <div><p className="text-sm text-gray-400">Views</p><p className="text-white">{site.view_count || 0}</p></div>
              {site.plot_number && <div><p className="text-sm text-gray-400">Plot</p><p className="text-white">{site.plot_number}</p></div>}
              {site.shortcut && <div><p className="text-sm text-gray-400">Shortcut</p><p className="text-white">{site.shortcut}</p></div>}
              {site.customization?.tags?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {site.customization.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-700 text-gray-200 text-xs rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coupons */}
        {coupons.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Promo Codes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coupons.map(c => (
                <div key={c.id} className="bg-[#202124] p-4 rounded-lg border border-green-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-green-400 text-lg">{c.code}</p>
                      {c.discount && <p className="text-white text-sm">{c.discount}</p>}
                      {c.description && <p className="text-gray-400 text-xs mt-1">{c.description}</p>}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(c.code)} className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600">Copy</button>
                  </div>
                  {c.expires_at && <p className="text-red-400 text-xs mt-2">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Events</h2>
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="bg-[#202124] p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-white font-bold">{ev.title}</h3>
                  {ev.description && <p className="text-gray-400 text-sm">{ev.description}</p>}
                  <p className="text-blue-400 text-xs mt-1">{new Date(ev.event_date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hours */}
        {site.customization?.hours && Object.keys(site.customization.hours).filter(k => k !== 'open24h' && site.customization.hours[k]).length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Hours of Operation</h2>
            {site.customization.hours.open24h ? (
              <p className="text-green-400 font-bold">Open 24/7</p>
            ) : (
              <div className="space-y-1">
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => (
                  site.customization.hours[day] && (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize w-32">{day}</span>
                      <span className="text-white">{site.customization.hours[day]}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social Links */}
        {site.customization?.social_links?.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Social Links</h2>
            <div className="flex flex-wrap gap-3">
              {site.customization.social_links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                  {link.platform || 'Link'}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {site.customization?.gallery?.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {site.customization.gallery.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                  <img src={img} alt={`Gallery ${i+1}`} className="w-full h-32 object-cover rounded-lg border border-gray-700 hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Staff */}
        {site.customization?.staff?.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Staff</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {site.customization.staff.map((member, i) => (
                <div key={i} className="bg-[#202124] p-4 rounded-lg border border-gray-700">
                  <p className="text-white font-bold">{member.name}</p>
                  <p className="text-gray-400 text-sm">{member.role}</p>
                  {member.discord && <p className="text-indigo-400 text-xs mt-1">{member.discord}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating Breakdown */}
        {site.customization?.rating_breakdown && Object.keys(site.customization.rating_breakdown).filter(k => site.customization.rating_breakdown[k] > 0).length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Ratings</h2>
            <div className="space-y-3">
              {Object.entries(site.customization.rating_breakdown).map(([key, val]) => (
                val > 0 && (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400 capitalize">{key}</span>
                      <span className="text-white">{val}/5</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${(val/5)*100}%`, backgroundColor: site.customization?.accent_color || '#3b82f6' }} />
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Custom Sections */}
        {site.customization?.custom_sections?.length > 0 && site.customization.custom_sections.map((section, i) => (
          section.title && section.content && (
            <div key={i} className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4" style={site.customization?.accent_color ? { color: site.customization.accent_color } : {}}>{section.title}</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{renderRichText(section.content)}</p>
            </div>
          )
        ))}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Announcements</h2>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="bg-[#202124] p-4 rounded border-l-4 border-yellow-500">
                  <h3 className="text-white font-bold mb-1">{a.title}</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{renderRichText(a.content)}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Reviews</h2>
            <div className="flex gap-2">
              <select value={reviewFilter} onChange={e => setReviewFilter(parseInt(e.target.value))} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-xs">
                <option value={0}>All Stars</option>
                <option value={5}>★★★★★</option>
                <option value={4}>★★★★</option>
                <option value={3}>★★★</option>
                <option value={2}>★★</option>
                <option value={1}>★</option>
              </select>
              <select value={reviewSort} onChange={e => setReviewSort(e.target.value)} className="px-2 py-1 bg-[#202124] border border-gray-700 rounded text-white text-xs">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>
          </div>
          {user && (
            <div className="mb-4 space-y-2">
              <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white">
                {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} Stars</option>)}
              </select>
              <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder="Write a review..." className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white" rows="3" />
              <button onClick={submitReview} className="px-4 py-2 bg-blue-600 text-white rounded">Submit Review</button>
            </div>
          )}
          <div className="space-y-3">
            {displayedReviews.map(r => (
              <div key={r.id} className="bg-[#202124] p-3 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold">{r.profiles?.username}</span>
                  <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                </div>
                <p className="text-gray-300 text-sm">{r.comment}</p>
                {r.media?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {r.media.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded border border-gray-700" />
                      </a>
                    ))}
                  </div>
                )}
                {user && (
                  <div className="flex gap-2 mt-2 text-xs">
                    <button onClick={() => handleReviewVote(r.id, 'up')} className={`flex items-center gap-1 px-2 py-0.5 rounded ${reviewVotes[r.id] === 'up' ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      ▲ {r.upvotes || 0}
                    </button>
                    <button onClick={() => handleReviewVote(r.id, 'down')} className={`flex items-center gap-1 px-2 py-0.5 rounded ${reviewVotes[r.id] === 'down' ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      ▼ {r.downvotes || 0}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {displayedReviews.length === 0 && <p className="text-gray-500">No reviews yet</p>}
          </div>
        </div>

        {/* Related Sites */}
        {relatedSites.length > 0 && (
          <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Related Sites</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedSites.map(rs => (
                <a key={rs.slug} href={`/site/${rs.slug}`} className="bg-[#202124] p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="flex items-center gap-2">
                    {rs.image_url && <img src={rs.image_url} alt="" className="w-8 h-8 rounded object-cover" onError={e => e.currentTarget.style.display='none'} />}
                    <span className="text-white text-sm font-bold truncate">{rs.name}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{rs.view_count || 0} views</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Comments</h2>
          {user && (
            <div className="mb-4 space-y-2">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white" rows="2" />
              <button onClick={submitComment} className="px-4 py-2 bg-blue-600 text-white rounded">Post Comment</button>
            </div>
          )}
          <div className="space-y-3">
            {comments.map(c => (
              <div key={c.id} className="bg-[#202124] p-3 rounded">
                <p className="text-white font-bold text-sm mb-1">{c.profiles?.username}</p>
                <p className="text-gray-300 text-sm">{c.comment}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-gray-500">No comments yet</p>}
          </div>
        </div>

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-4">QR Code</h3>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`} alt="QR Code" className="mx-auto" />
              <p className="text-gray-400 text-sm text-center mt-2">Scan to visit this site</p>
              <button onClick={() => setShowQR(false)} className="w-full mt-4 px-4 py-2 bg-gray-700 text-white rounded">Close</button>
            </div>
          </div>
        )}

        {/* Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMergeModal(false)}>
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-4">Suggest Merge</h3>
              <p className="text-gray-400 text-sm mb-4">Enter the slug of the site you believe is a duplicate:</p>
              <input type="text" value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} placeholder="site-slug" className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white mb-4" />
              <div className="flex gap-2">
                <button onClick={handleMergeRequest} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">Submit Request</button>
                <button onClick={() => setShowMergeModal(false)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Tip Modal */}
        {showTipModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-4">Send Tip</h3>
              <p className="text-gray-400 mb-4">Your balance: ${userBalance.toFixed(2)}</p>
              <input type="number" value={tipAmount} onChange={e => setTipAmount(parseFloat(e.target.value))} min="1" className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white mb-4" />
              <div className="flex gap-2">
                <button onClick={submitTip} className="flex-1 px-4 py-2 bg-green-600 text-white rounded">Send</button>
                <button onClick={() => setShowTipModal(false)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-4">Report Site</h3>
              <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Reason for report..." className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white mb-4" rows="4" />
              <div className="flex gap-2">
                <button onClick={submitReport} className="flex-1 px-4 py-2 bg-red-600 text-white rounded">Submit</button>
                <button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
