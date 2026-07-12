import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const profileId = id || user?.id;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(['shop', 'bank', 'casino', 'service', 'entertainment']);

  useEffect(() => {
    if (profileId) fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', profileId).single();
    setProfile(p);
    
    if (p?.ad_preferences && Array.isArray(p.ad_preferences)) {
      setPreferences(p.ad_preferences);
    }
    setLoading(false);
  };

  const togglePref = async (cat) => {
    const newPrefs = preferences.includes(cat) 
      ? preferences.filter(p => p !== cat) 
      : [...preferences, cat];
    setPreferences(newPrefs);
    await supabase.from('profiles').update({ ad_preferences: newPrefs }).eq('id', profileId);
  };

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;
  if (!profile) return <Layout><div className="p-8 text-center">Profile not found.</div></Layout>;

  const discordName = user?.user_metadata?.full_name || user?.user_metadata?.name || profile?.username || 'User';
  const discordEmail = user?.email || profile?.email || 'No email';
  const discordAvatar = user?.user_metadata?.avatar_url || profile?.avatar_url || `https://ui-avatars.com/api/?name=${discordName}&background=random`;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-6">
            <img src={discordAvatar} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{discordName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{discordEmail}</p>
              {profile.mc_username && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  MC: {profile.mc_username} {profile.mc_verified && <span className="text-green-500">✓</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
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
