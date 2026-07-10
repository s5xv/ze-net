import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Footer from '../components/Footer';

export default function Account({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState({ mc_username: '', bio: '' });
  const [balance, setBalance] = useState(0);
  const [mySites, setMySites] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Get profile
    const { data: userData } = await supabase
      .from('users')
      .select('mc_username, bio')
      .eq('id', user.id)
      .single();
    setProfile(userData || { mc_username: '', bio: '' });

    // Get balance
    const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', user.id).single();
    setBalance(balData?.balance || 0);

    // Get owned sites
    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .eq('owner_discord_id', user.id)
      .order('created_at', { ascending: false });
    setMySites(sitesData || []);

    // Get my reviews
    const { data: reviewsData } = await supabase
      .from('site_reviews')
      .select('*, sites(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyReviews(reviewsData || []);

    // Get my comments
    const { data: commentsData } = await supabase
      .from('site_comments')
      .select('*, sites(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setMyComments(commentsData || []);

    setLoading(false);
  };

  const updateProfile = async () => {
    const { error } = await supabase
      .from('users')
      .upsert({ id: user.id, mc_username: profile.mc_username, bio: profile.bio })
      .eq('id', user.id);
    
    if (!error) alert('Profile updated!');
    else alert('Error: ' + error.message);
  };

  const userDisplayName = user?.user_metadata?.global_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.avatar;
  const fullAvatarUrl = userAvatar 
    ? (userAvatar.startsWith('http') ? userAvatar : `https://cdn.discordapp.com/avatars/${user.id}/${userAvatar}.png?size=256`)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-[#303134] border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Account</h1>
          <div className="flex gap-3">
            <button onClick={toggleTheme} className="text-sm text-gray-600 dark:text-gray-400">{isDark ? '☀️' : '🌙'}</button>
            <a href="/" className="text-sm text-gray-600 dark:text-gray-400">Home</a>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Profile Header */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {fullAvatarUrl ? (
              <img src={fullAvatarUrl} alt={userDisplayName} className="w-20 h-20 rounded-full object-cover border-2 border-blue-500" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                {userDisplayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{userDisplayName}</h2>
              <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
              {profile.mc_username && <p className="text-sm text-blue-600">MC: {profile.mc_username}</p>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
            {['overview', 'profile', 'sites', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4">
                <p className="text-sm text-gray-500">Balance</p>
                <p className="text-2xl font-bold text-green-600">${balance.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4">
                <p className="text-sm text-gray-500">Sites Owned</p>
                <p className="text-2xl font-bold">{mySites.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4">
                <p className="text-sm text-gray-500">Reviews Written</p>
                <p className="text-2xl font-bold">{myReviews.length}</p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minecraft Username</label>
                <input
                  type="text"
                  value={profile.mc_username}
                  onChange={(e) => setProfile({...profile, mc_username: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  placeholder="Your MC name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                  rows="3"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <button onClick={updateProfile} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                Save Profile
              </button>
            </div>
          )}

          {activeTab === 'sites' && (
            <div className="space-y-3">
              {mySites.length === 0 ? (
                <p className="text-gray-500">You don't own any sites yet.</p>
              ) : (
                mySites.map((site) => (
                  <div key={site.id} className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg">{site.name}</h3>
                    <p className="text-sm text-gray-500">{site.description}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => navigate(`/site/${site.slug}`)} className="text-sm text-blue-600 hover:underline">View</button>
                      <button onClick={() => navigate(`/site/${site.slug}/manage`)} className="text-sm text-blue-600 hover:underline">Manage</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Your Reviews</h3>
              {myReviews.length === 0 ? (
                <p className="text-gray-500">You haven't written any reviews yet.</p>
              ) : (
                myReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                      <span className="text-sm text-gray-500">for {review.sites?.name}</span>
                    </div>
                    {review.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>}
                  </div>
                ))
              )}

              <h3 className="font-bold text-lg mt-6">Your Comments</h3>
              {myComments.length === 0 ? (
                <p className="text-gray-500">You haven't commented yet.</p>
              ) : (
                myComments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-[#202124] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">on {comment.sites?.name}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
