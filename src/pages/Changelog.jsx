import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';
import { useTheme } from '../hooks/useTheme';

export default function Changelog() {
  const { user } = useAuth(); {
  const { isDark, toggleTheme } = useTheme();

  const changelog = [
    {
      date: '2026-07-10',
      version: '1.0.0',
      changes: [
        'Initial release of Z&E Net',
        'Discord OAuth login',
        'Minecraft account linking',
        'Deposit/withdrawal system',
        'Admin dashboard',
        'Site management',
        'Bookmarks and recently viewed',
        'Search with analytics',
        'Mobile responsive design',
        'Mining game easter egg'
      ]
    }
  ];

  return (
    <Layout user={user}>
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Changelog</h1>

        <div className="space-y-6">
          {changelog.map((release) => (
            <div key={release.version} className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-lg">v{release.version}</span>
                <span className="text-sm text-neutral-500">{release.date}</span>
              </div>
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
