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
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchProfile(); 
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    
    // Get profile data
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (profileData) {
      setProfileUser(profileData);
      
      // Get user's sites
      const { data: sitesData } = await supabase.from('sites').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
      setUserSites(sitesData || []);
    } else {
      // Fallback: try to get from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user) {
        setProfileUser({
          id: userData.user.id,
          username: userData.user.user_metadata?.name || userData.user.email?.split('@')[0],
          avatar_url: userData.user.user_metadata?.avatar_url,
          mc_username: null
        });
      }
    }
    setLoading(false);
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!profileUser) return <Layout user={user}><div className="p-8 text-center">User not found</div></Layout>;

  const displayName = profileUser.mc_username || profileUser.username || profileUser.id.slice(0, 8);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#303134] rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm mb-8 flex items-center gap-6">
          {profileUser.avatar_url ? (
            <img src={profileUser.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-4xl">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <p className="text-gray-500 dark:text-gray-400">{userSites.length} sites owned</p>
            {profileUser.mc_username && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-mono">MC: {profileUser.mc_username}</p>
            )}
          </div>
        </div>

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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
