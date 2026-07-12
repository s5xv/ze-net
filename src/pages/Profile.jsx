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

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileData) {
      setProfileUser(profileData);
      const { data: sitesData } = await supabase.from('sites').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
      setUserSites(sitesData || []);
    }
    setLoading(false);
  };

  if (loading) return <Layout user={user}><div className="p-8 text-center">Loading...</div></Layout>;
  if (!profileUser) return <Layout user={user}><div className="p-8 text-center">User not found</div></Layout>;

  const displayName = profileUser.username || profileUser.id.slice(0, 8);

  
  const [preferences, setPreferences] = useState(['shop', 'bank', 'casino', 'service', 'entertainment']);

  useEffect(() => {
    const fetchPrefs = async () => {
      if (user) {
        const { data } = await supabase.from('profiles').select('ad_preferences').eq('id', user.id).single();
        if (data?.ad_preferences && Array.isArray(data.ad_preferences)) {
          setPreferences(data.ad_preferences);
        }
      }
    };
    fetchPrefs();
  }, [user]);

  const togglePref = async (cat) => {
    const newPrefs = preferences.includes(cat) 
      ? preferences.filter(p => p !== cat) 
      : [...preferences, cat];
    setPreferences(newPrefs);
    await supabase.from('profiles').update({ ad_preferences: newPrefs }).eq('id', user.id);
  };
  
  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#303134] rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm mb-8 flex items-center gap-6">
          {profileUser.avatar_url ? <img src={profileUser.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" /> : <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-4xl">{displayName[0]?.toUpperCase()}</div>}
          <div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <p className="text-gray-500 dark:text-gray-400">{userSites.length} sites owned</p>
            {profileUser.mc_username && <p className="text-sm text-blue-500 mt-1">MC: {profileUser.mc_username}</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Owned Sites ({userSites.length})</h2>
          {userSites.length === 0 ? <p className="text-gray-500 italic">No sites owned yet</p> : (
            <div className="space-y-3">
              {userSites.map((site) => (<div key={site.id} onClick={() => navigate(`/site/${site.slug}`)} className="p-4 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/30 cursor-pointer transition-colors"><div className="flex justify-between items-start"><div><h3 className="font-semibold text-lg">{site.name} {site.is_verified && <span className="text-blue-500 text-sm">✓</span>}</h3><p className="text-sm text-gray-500">{site.category}</p></div><div className="text-right"><p className="text-sm text-gray-500">{site.view_count || 0} views</p></div></div></div>))}
            </div>
          )}
        </div>
      
        {/* Ad Preferences Section */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mt-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Ad Preferences</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which types of ads you want to see on the homepage.</p>
          <div className="flex flex-wrap gap-3">
            {['shop', 'bank', 'casino', 'service', 'entertainment'].map(cat => (
              <button 
                key={cat}
                onClick={() => togglePref(cat)}
                className={`px-4 py-2 rounded-lg font-medium capitalize text-sm transition-colors ${
                  preferences.includes(cat) 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
  
    </main>
    </Layout>
  );
}
