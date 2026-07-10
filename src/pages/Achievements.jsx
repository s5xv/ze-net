import { useTheme } from '../hooks/useTheme';
import { useAchievements, ACHIEVEMENTS } from '../hooks/useAchievements';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Achievements() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unlocked } = useAchievements(user);
  const achievementList = Object.entries(ACHIEVEMENTS);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Achievements</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievementList.map(([key, ach]) => {
            const isUnlocked = unlocked.includes(key);
            return (
              <div key={key} className={`p-5 rounded-xl border ${isUnlocked ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white dark:bg-[#303134] border-gray-200 dark:border-gray-700 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{ach.icon}</div>
                  <div>
                    <h3 className="font-bold">{ach.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{ach.description}</p>
                    <p className="text-xs font-bold text-blue-600 mt-1">+{ach.xp} XP</p>
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
