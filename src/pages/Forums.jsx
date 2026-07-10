import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Forums() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">DemocracyCraft Forums</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="https://www.democracycraft.net/forums" target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all">
            <h3 className="text-xl font-bold mb-2">Main Forums</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visit the official DemocracyCraft forums</p>
          </a>
        </div>
      </main>
    </Layout>
  );
}
