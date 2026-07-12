import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/useRealtime';

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
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [newComment, setNewComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(1);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => { fetchSite(); }, [slug, user]);
  usePolling(async () => {
    if (!site?.id) return;
    const { data: c } = await supabase.from('site_comments').select('*, user:user_id(username)').eq('site_id', site.id).order('created_at', { ascending: false });
    if (c) setComments(c);
    const { data: r } = await supabase.from('site_reviews').select('*, user:user_id(username)').eq('site_id', site.id).order('created_at', { ascending: false });
    if (r) setReviews(r);
  }, 10000, !!site?.id);

  const fetchSite = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) { setLoading(false); return; }
    
    if (data) {
      setSite(data);
      await supabase.from('sites').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
      
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

      const { data: revs } = await supabase.from('site_reviews').select('*, profiles(username)').eq('site_id', data.id).order('created_at', { ascending: false });
      setReviews(revs || []);

      const { data: coms } = await supabase.from('site_comments').select('*, profiles(username)').eq('site_id', data.id).order('created_at', { ascending: false });
      setComments(coms || []);
    }
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

  const apiAction = (action, body) => fetch('/api/app?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const handleUpvote = async () => {
    if (!user || !site?.id) return;
    await apiAction('toggle-upvote', { siteId: site.id, userId: user.id, remove: hasUpvoted });
    setHasUpvoted(!hasUpvoted);
    setUpvotes(u => hasUpvoted ? u - 1 : u + 1);
  };

  const submitReview = async () => {
    if (!user || !site?.id || !newReview.comment.trim()) return;
    await apiAction('submit-review', { siteId: site.id, userId: user.id, rating: newReview.rating, comment: newReview.comment });
    setNewReview({ rating: 5, comment: '' });
    fetchSite();
  };

  const submitComment = async () => {
    if (!user || !site?.id || !newComment.trim()) return;
    await apiAction('submit-comment', { siteId: site.id, userId: user.id, comment: newComment });
    setNewComment('');
    fetchSite();
  };

  const submitReport = async () => {
    if (!user || !site?.id || !reportReason.trim()) return;
    await apiAction('submit-report', { siteId: site.id, userId: user.id, reason: reportReason });
    setShowReportModal(false);
    setReportReason('');
    alert('Report submitted');
  };

  const submitTip = async () => {
    if (!user || !site?.id || !site?.user_id) return;
    if (userBalance < tipAmount) {
      alert('Insufficient balance');
      return;
    }
    const { error: deductErr } = await supabase.rpc('increment_balance', { target_user_id: user.id, deposit_amount: -tipAmount });
    if (deductErr) { alert('Failed to process tip'); return; }
    const { error: addErr } = await supabase.rpc('increment_balance', { target_user_id: site.user_id, deposit_amount: tipAmount });
    if (addErr) {
      await supabase.rpc('increment_balance', { target_user_id: user.id, deposit_amount: tipAmount });
      alert('Failed to process tip');
      return;
    }
    
    await supabase.from('transactions').insert({
      txn_id: 'TIP-' + Date.now(),
      user_id: user.id,
      amount: -tipAmount,
      type: 'tip',
      ref_id: 'tip-' + Date.now(),
      note: `Tip to ${site.name}`
    });
    
    setUserBalance(newMyBal);
    setShowTipModal(false);
    alert('Tip sent!');
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center text-white">Loading site...</div>
      </Layout>
    );
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
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{site.name}</h1>
              {site.is_verified && <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">VERIFIED</span>}
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
              <p className="text-gray-300 text-lg">{site.description}</p>
            </div>

            <div className="flex gap-3">
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">Visit Site</a>
              {user && site.user_id && user.id !== site.user_id && (
                <button onClick={() => setShowTipModal(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold">Tip Owner</button>
              )}
              {user && (site.owner_user_id === user.id || site.user_id === user.id) && (
                <>
                  <a href={`/site/${slug}/manage`} className="px-4 py-3 bg-yellow-600 text-white rounded-lg font-bold text-sm">Manage</a>
                  <a href={`/site/${slug}/analytics`} className="px-4 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm">Analytics</a>
                </>
              )}
              <button onClick={() => setShowReportModal(true)} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold">Report</button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700">
              <div><p className="text-sm text-gray-400">Category</p><p className="text-white capitalize">{site.category}</p></div>
              <div><p className="text-sm text-gray-400">Views</p><p className="text-white">{site.view_count || 0}</p></div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-8 bg-[#303134] border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Reviews</h2>
          {user && (
            <div className="mb-4 space-y-2">
              <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white">
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder="Write a review..." className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded text-white" rows="3" />
              <button onClick={submitReview} className="px-4 py-2 bg-blue-600 text-white rounded">Submit Review</button>
            </div>
          )}
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#202124] p-3 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold">{r.profiles?.username}</span>
                  <span className="text-yellow-400">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="text-gray-300 text-sm">{r.comment}</p>
              </div>
            ))}
            {reviews.length === 0 && <p className="text-gray-500">No reviews yet</p>}
          </div>
        </div>

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
