import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { ACHIEVEMENTS } from '../hooks/useAchievements';

const ACHIEVEMENTS_LIST = Object.entries(ACHIEVEMENTS).map(([id, a]) => ({ id, ...a }));

export default function Achievements() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUnlocked();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUnlocked = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, achievement_key')
        .eq('user_id', user.id);
      if (!error && data) {
        setUnlockedIds(data.map(a => a.achievement_key || a.achievement_id));
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-gray-500">Loading achievements...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Achievements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user ? `You have unlocked ${unlockedIds.length} out of ${ACHIEVEMENTS_LIST.length} achievements!` : 'Sign in to track your achievements!'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isUnlocked = unlockedIds.includes(ach.id);
            return (
              <div 
                key={ach.id} 
                className={`p-5 rounded-xl border transition-all ${
                  isUnlocked 
                    ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5' 
                    : 'bg-white dark:bg-[#303134] border-gray-200 dark:border-gray-700 opacity-60 grayscale'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl bg-gray-100 dark:bg-[#202124] p-3 rounded-lg">
                    {ach.icon}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg mb-1">{ach.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{ach.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                        +{ach.xp} XP
                      </span>
                      {isUnlocked && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                          ✓ Unlocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
