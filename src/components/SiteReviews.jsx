import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';

export default function SiteReviews({ siteId, user }) {
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (siteId) loadData();
  }, [siteId, user]);

  const loadData = async () => {
    const { data: r } = await supabase
      .from('site_reviews')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });
    setReviews(r || []);

    const { data: c } = await supabase
      .from('site_comments')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(50);
    setComments(c || []);

    if (user) {
      const { data: ur } = await supabase
        .from('site_reviews')
        .select('*')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .single();
      setUserReview(ur);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return alert('Sign in to review');
    setSubmitting(true);

    const { error } = await supabase.from('site_reviews').upsert({
      site_id: siteId,
      user_id: user.id,
      rating: newRating,
      comment: newReviewComment || null
    });

    if (!error) {
      setNewReviewComment('');
      loadData();
    }
    setSubmitting(false);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from('site_comments').insert({
      site_id: siteId,
      user_id: user.id,
      content: newComment.trim()
    });

    if (!error) {
      setNewComment('');
      loadData();
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 mt-6">
      {/* Rating Summary */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold mb-1">Reviews</h2>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <span key={i} className={`text-xl ${i <= Math.round(avgRating) ? 'text-yellow-500' : 'text-neutral-300 dark:text-neutral-700'}`}>★</span>
              ))}
            </div>
            <span className="text-sm text-neutral-500">
              {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Submit Review */}
      {user && (
        <form onSubmit={submitReview} className="mb-6 pb-6 border-b border-neutral-200 dark:border-white/10">
          <h3 className="font-semibold mb-3">{userReview ? 'Update Your Review' : 'Write a Review'}</h3>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setNewRating(i)}
                className={`text-3xl transition-transform hover:scale-110 ${i <= newRating ? 'text-yellow-500' : 'text-neutral-300 dark:text-neutral-700'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={newReviewComment}
            onChange={(e) => setNewReviewComment(e.target.value)}
            placeholder="Share your thoughts (optional)..."
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg mb-2 focus:outline-none focus:border-orange-500"
            rows="2"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="mb-6 pb-6 border-b border-neutral-200 dark:border-white/10">
          <h3 className="font-semibold mb-3">Reviews</h3>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 bg-neutral-50 dark:bg-[#09090b] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-500' : 'text-neutral-300'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-neutral-700 dark:text-neutral-300">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="font-semibold mb-3">Comments ({comments.length})</h3>
        
        {user && (
          <form onSubmit={submitComment} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-grow px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Post
              </button>
            </div>
          </form>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-neutral-500">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="p-3 bg-neutral-50 dark:bg-[#09090b] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-neutral-500">
                    {c.user_id.slice(0, 8)}...
                  </span>
                  <span className="text-xs text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
