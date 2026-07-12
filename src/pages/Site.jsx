import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

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

  const fetchSite = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').eq('slug', slug).single();
    
    if (data) {
      setSite(data);
      await supabase.from('sites').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
      
      if (user) {
        const { data: bookmark } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('site_id', data.id).single();
        setIsBookmarked(!!bookmark);
        const { data: follow } = await supabase.from('site_followers').select('id').eq('user_id', user.id).eq('site_id', data.id).single();
        setIsFollowing(!!follow);
        const { data: upvote } = await supabase.from('site_upvotes').select('id').eq('user_id', user.id).eq('site_id', data.id).single();
        setHasUpvoted(!!upvote);
        const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).maybeSingle();
        setUserBalance(balData?.balance || 0);
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

  const handleTip = async () => {
    if (!user) return alert('Please sign in');
    if (!site.owner_user_id) return alert('This site has no owner to tip');
    if (tipAmount <= 0) return alert('Invalid tip amount');
    if (userBalance < tipAmount) return alert('Insufficient balance');

    try {
      await supabase.from('site_balances').update({ balance: userBalance - tipAmount }).eq('user_id', user.id);
      const { data: receiverBal } = await supabase.from('site_balances').select('balance').eq('user_id', site.owner_user_id).maybeSingle();
      await supabase.from('site_balances').update({ balance: (receiverBal?.balance || 0) + tipAmount }).eq('user_id', site.owner_user_id);
      await supabase.from('tips').insert({ sender_id: user.id, receiver_id: site.owner_user_id, site_id: site.id, amount: tipAmount });
      alert(`Successfully tipped $${tipAmount}!`);
      setShowTipModal(false);
      fetchSite();
    } catch (err) {
      alert('Error sending tip: ' + err.message);
    }
  };

  const handleFollow = async () => {
    if (!user) return alert('Please sign in');
    if (isFollowing) {
      await supabase.from('site_followers').delete().eq('user_id', user.id).eq('site_id', site.id);
      setIsFollowing(false);
    } else {
      await supabase.from('site_followers').insert({ user_id: user.id, site_id: site.id });
      setIsFollowing(true);
    }
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

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('site_reviews').upsert({ site_id: site.id, user_id: user.id, rating: newReview.rating, comment: newReview.comment });
    setNewReview({ rating: 5, comment: '' });
    fetchSite();
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    await supabase.from('site_comments').insert({ site_id: site.id, user_id: user.id, content: newComment.trim() });
    setNewComment('');
    fetchSite();
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('reports').insert({ reporter_id: user.id, target_type: 'site', target_id: site.id, target_name: site.name, reason: reportReason, status: 'pending' });
    alert('Report submitted.');
    setShowReportModal(false);
    setReportReason('');
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!site) return <Layout user={user}><div className="p-8 text-center">Site not found</div></Layout>;

  const isOwner = user && site.owner_user_id === user.id;

  
  

  
  // STRICT Pay-Per-View Logic (10-Second Dwell Time)
  useEffect(() => {
    if (!user || !siteData?.id || !siteData?.user_id || user.id === siteData.user_id) return;

    let timeout;
    let hasTracked = false;

    const trackView = () => {
      if (hasTracked) return;
      hasTracked = true;
      
      fetch('/api/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          siteId: siteData.id, 
          ownerId: siteData.user_id, 
          viewerId: user.id 
        })
      }).catch(err => console.error('PPV Error:', err));
    };

    // Only trigger payment if user stays on the page for 10 full seconds
    timeout = setTimeout(trackView, 10000);

    return () => clearTimeout(timeout);
  }, [siteData?.id, user]);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-grow">
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
              {site.keywords && site.keywords.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {site.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded">{kw}</span>
                  ))}
                </div>
              )}
            </div>
            
            {/* ACTION BUTTONS (Green, No Emojis) */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {isOwner && (
                <button onClick={() => navigate(`/site/${slug}/manage`)} className="px-4 py-2 font-medium rounded-lg transition-colors text-sm bg-green-600 hover:bg-green-700 text-white">Manage</button>
              )}
              <button onClick={() => setShowTipModal(true)} className="px-4 py-2 font-medium rounded-lg transition-colors text-sm bg-green-600 hover:bg-green-700 text-white">Tip</button>
              <button onClick={handleFollow} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${isFollowing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'}`}>{isFollowing ? 'Following' : 'Follow'}</button>
              <button onClick={handleBookmark} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${isBookmarked ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'}`}>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</button>
              <button onClick={handleUpvote} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${hasUpvoted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'}`}>Upvote ({upvotes})</button>
              <button onClick={() => setShowReportModal(true)} className="px-4 py-2 font-medium rounded-lg transition-colors text-sm bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900 dark:hover:bg-opacity-40">Report</button>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{site.description}</p>
          </div>

          {site.url && site.url !== '#' && (
            <div className="mb-6">
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Visit Website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          )}
        </div>

        {/* TIP MODAL */}
        {showTipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Tip {site.name}</h2>
              <p className="text-sm text-gray-500 mb-4">Your balance: ${userBalance.toFixed(2)}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tip Amount ($)</label>
                <input type="number" min="0.01" step="0.01" value={tipAmount} onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
              </div>
              <div className="flex gap-2 mb-4">
                {[1, 5, 10, 25].map(amt => (<button key={amt} onClick={() => setTipAmount(amt)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600">${amt}</button>))}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowTipModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
                <button onClick={handleTip} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Send Tip</button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4">Reviews ({reviews.length})</h2>
          {user && (
            <form onSubmit={handleReview} className="mb-6 p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(i => (<button key={i} type="button" onClick={() => setNewReview({...newReview, rating: i})} className={`text-3xl ${i <= newReview.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</button>))}</div>
              <textarea value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} placeholder="Write a review..." className="w-full px-3 py-2 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-lg mb-2" rows="2" />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Submit Review</button>
            </form>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1"><span className="text-yellow-500">{'★'.repeat(r.rating)}</span><span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span></div>
              {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
            </div>
          ))}
        </div>

        {/* COMMENTS */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>
          {user && (
            <form onSubmit={handleComment} className="mb-4 flex gap-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-grow px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Post</button>
            </form>
          )}
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg mb-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {/* REPORT MODAL */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Report {site.name}</h2>
              <form onSubmit={handleReport}>
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg mb-4" rows="4" required />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
