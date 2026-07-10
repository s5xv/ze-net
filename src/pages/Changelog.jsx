import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Changelog() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8">Changelog</h1>
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-xl font-bold mb-2">Latest Updates</h2>
              <p className="text-sm text-gray-500 mb-3">July 2026</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Added unified Layout component for consistent UI</li>
                <li>Fixed API routing (single endpoint handler)</li>
                <li>Added wiki sync feature</li>
                <li>Added daily challenges</li>
                <li>Added achievements system</li>
                <li>Added leaderboard</li>
                <li>Improved search with case-insensitive matching</li>
                <li>Fixed "I'm feeling lucky" to work with wiki pages</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
