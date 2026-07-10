import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [profileUser, setProfileUser] = useState(null);
  const [userSites, setUserSites] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [userCollections, setUserCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    
    // Get user info
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user) {
      setProfileUser(userData.user);
    }

    // Get user's sites
    const { data: sitesData } = await supabase.from('sites').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
    setUserSites(sitesData || []);

    // Get user's reviews
    const { data: reviewsData } = await supabase.from('site_reviews').select('*, sites(name, slug)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    setUserReviews(reviewsData || []);

    // Get user's achievements
    const { data: achievementsData } = await supabase.from('user_achievements').select('*').eq('user_id', userId);
    setUserAchievements(achievementsData || []);

    // Get user's public collections
    const { data: collectionsData } = await supabase.from('collections').select('*').eq('user_id', userId).eq('is_public', true).order('created_at', { ascending: false });
    setUserCollections(collectionsData || []);

    setLoading(false);
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!profileUser) return <Layout user={user}><div className="p-8 text-center">User not found</div></Layout>;

  const displayName = profileUser.user_metadata?.name || profileUser.email?.split('@')[0] || 'User';
  const avatarUrl = profileUser.user_metadata?.avatar_url;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Profile Header */}
        <div className="bg-white dark:bg-[#303134] rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
          <div className="flex items-center gap-6">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-4xl border-4 border-blue-600">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
              <p className="text-gray-500 dark:text-gray-400">{userSites.length} sites • {userReviews.length} reviews • {userAchievements.length} achievements</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* User's Sites */}
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Owned Sites ({userSites.length})</h2>
              {userSites.length === 0 ? (
                <p className="text-gray-500 italic">No sites owned yet</p>
              ) : (
                <div className="space-y-3">
                  {userSites.map((site) => (
                    <div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/30 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{site.name} {site.is_verified && <span className="text-blue-500 text-sm">✓</span>}</h3>
                          <p className="text-sm text-gray-500">{site.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{site.view_count || 0} views</p>
                          <p className="text-sm text-gray-500">{site.click_count || 0} clicks</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Recent Reviews ({userReviews.length})</h2>
              {userReviews.length === 0 ? (
                <p className="text-gray-500 italic">No reviews yet</p>
              ) : (
                <div className="space-y-3">
                  {userReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                        <span className="text-sm text-gray-500">on <a href={`/site/${review.sites?.slug}`} className="text-blue-600 hover:underline">{review.sites?.name}</a></span>
                        <span className="text-xs text-gray-400 ml-auto">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      {review.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Achievements */}
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Achievements ({userAchievements.length})</h2>
              {userAchievements.length === 0 ? (
                <p className="text-gray-500 italic">No achievements yet</p>
              ) : (
                <div className="space-y-2">
                  {userAchievements.map((achievement, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#202124] rounded-lg">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-2xl"></div>
                      <div>
                        <p className="font-semibold text-sm">{achievement.achievement_id}</p>
                        <p className="text-xs text-gray-500">{new Date(achievement.unlocked_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collections */}
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Collections ({userCollections.length})</h2>
              {userCollections.length === 0 ? (
                <p className="text-gray-500 italic">No public collections</p>
              ) : (
                <div className="space-y-2">
                  {userCollections.map((collection) => (
                    <div key={collection.id} onClick={() => navigate(`/collection/${collection.id}`)} className="p-3 bg-gray-50 dark:bg-[#202124] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer transition-colors">
                      <h3 className="font-semibold text-sm">{collection.name}</h3>
                      {collection.description && <p className="text-xs text-gray-500 line-clamp-2">{collection.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
