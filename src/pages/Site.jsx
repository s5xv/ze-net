import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Site() {
  const { user } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedSites, setRelatedSites] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [newComment, setNewComment] = useState('');

  useEffect(() => { fetchSite(); }, [slug]);

  const fetchSite = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    
    if (data) {
      setSite(data);
      await supabase.from('sites').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
      
      const { data: related } = await supabase.from('sites').select('*').eq('category', data.category).neq('id', data.id).limit(5);
      setRelatedSites(related || []);

      if (user) {
        const { data: bookmark } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('site_id', data.id).single();
        setIsBookmarked(!!bookmark);
        const { data: upvote } = await supabase.from('site_upvotes').select('id').eq('user_id', user.id).eq('site_id', data.id).single();
        setHasUpvoted(!!upvote);
      }

      const { count } = await supabase.from('site_upvotes').select('*', { count: 'exact', head: true }).eq('site_id', data.id);
      setUpvotes(count || 0);

      const { data: reviewsData } = await supabase.from('site_reviews').select('*').eq('site_id', data.id).order('created_at', { ascending: false });
      setReviews(reviewsData || []);

      const { data: commentsData } = await supabase.from('site_comments').select('*').eq('site_id', data.id).order('created_at', { ascending: false }).limit(20);
      setComments(commentsData || []);
    }
    setLoading(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    await supabase.from('site_comments').insert({ site_id: site.id, user_id: user.id, content: newComment.trim() });
    setNewComment('');
    fetchSite();
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('site_reviews').upsert({ site_id: site.id, user_id: user.id, rating: newReview.rating, comment: newReview.comment });
    setNewReview({ rating: 5, comment: '' });
    fetchSite();
  };

  const handleUpvote = async () => {
    if (!user) return alert('Please sign in');
    if (hasUpvoted) {
      await supabase.from('site_upvotes').delete().eq('user_id', user.id).eq('site_id', site.id);
      setHasUpvoted(false); setUpvotes(u => u - 1);
    } else {
      await supabase.from('site_upvotes').insert({ user_id: user.id, site_id: site.id });
      setHasUpvoted(true); setUpvotes(u => u + 1);
    }
  };

  const handleBookmark = async () => {
    if (!user) return alert('Please sign in');
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('site_id', site.id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, site_id: site.id });
      setIsBookmarked(true);
    }
  };

  const handleVisit = async (urlObj) => {
    if (site) {
      await supabase.from('sites').update({ click_count: (site.click_count || 0) + 1 }).eq('id', site.id);
      window.open(urlObj.url, '_blank');
    }
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!site) return <Layout user={user}><div className="p-8 text-center">Site not found</div></Layout>;

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-grow">
              {/* REAL VERIFIED BADGE HERE */}
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold">{site.name}</h1>
                {site.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-2">{site.category}</p>
              {site.owner_name && <p className="text-sm text-gray-500 dark:text-gray-400">Owner: {site.owner_name}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <button onClick={handleBookmark} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${isBookmarked ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'}`}>{isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
              <button onClick={handleUpvote} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${hasUpvoted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'}`}>{hasUpvoted ? '✓ Upvoted' : 'Upvote'} ({upvotes})</button>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{site.description}</p>
          </div>

          {site.url && (
            <div className="mb-6">
              <button onClick={() => handleVisit({ url: site.url })} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Visit Website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4 text-center">
            <div><p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{site.view_count || 0}</p><p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Views</p></div>
            <div><p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{site.click_count || 0}</p><p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Clicks</p></div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4">Reviews ({reviews.length})</h2>
          {reviews.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-yellow-500">{avgRating.toFixed(1)}</span>
                <div className="flex">{[1,2,3,4,5].map(i => (<span key={i} className={`text-xl ${i <= Math.round(avgRating) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-700'}`}>★</span>))}</div>
              </div>
            </div>
          )}
          {user && (
            <form onSubmit={handleReview} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <h3 className="font-semibold mb-3">Write a Review</h3>
              <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(i => (<button key={i} type="button" onClick={() => setNewReview({...newReview, rating: i})} className={`text-3xl transition-transform hover:scale-110 ${i <= newReview.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-700'}`}>★</button>))}</div>
              <textarea value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} placeholder="Share your thoughts..." className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg mb-2" rows="2" />
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Submit Review</button>
            </form>
          )}
          {reviews.map((review) => (
            <div key={review.id} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1"><div className="flex">{[1,2,3,4,5].map(i => (<span key={i} className={`text-sm ${i <= review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>))}</div><span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span></div>
              {review.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>}
            </div>
          ))}
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>
          {user && (
            <form onSubmit={handleComment} className="mb-4">
              <div className="flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Post</button>
              </div>
            </form>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg mb-2">
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-mono text-gray-500">{comment.user_id.slice(0, 8)}...</span><span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
            </div>
          ))}
        </div>

        {relatedSites.length > 0 && (
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Related Sites</h2>
            <div className="space-y-3">
              {relatedSites.map((related) => (
                <div key={related.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/site/${related.slug}`)}>
                  <h3 className="font-semibold">{related.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{related.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
