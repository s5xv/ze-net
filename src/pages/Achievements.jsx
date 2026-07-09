import { useTheme } from './hooks/useTheme';
import { useAchievements, ACHIEVEMENTS } from './hooks/useAchievements';
import Footer from '../components/Footer';
import AdminButton from '../components/AdminButton';

export default function Achievements({ user }) {
  const { isDark, toggleTheme } = useTheme();
  const { unlocked } = useAchievements(user);

  const totalXP = unlocked.reduce((sum, key) => sum + (ACHIEVEMENTS[key]?.xp || 0), 0);
  const achievementList = Object.entries(ACHIEVEMENTS);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        {user && <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>}
        {user && <AdminButton />}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Achievements</h1>
          <p className="text-neutral-500 mb-6">
            {user ? `You've unlocked ${unlocked.length} of ${achievementList.length} achievements` : 'Sign in to track your achievements'}
          </p>
          {user && (
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl text-xl">
              {totalXP} XP Total
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievementList.map(([key, ach]) => {
            const isUnlocked = unlocked.includes(key);
            return (
              <div
                key={key}
                className={`p-5 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/30 shadow-lg'
                    : 'bg-white dark:bg-[#111111] border-neutral-200 dark:border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-4xl ${isUnlocked ? '' : 'grayscale'}`}>{ach.icon}</div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{ach.title}</h3>
                      {isUnlocked && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{ach.description}</p>
                    <p className="text-xs font-bold text-orange-500">+{ach.xp} XP</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
