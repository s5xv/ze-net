import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const changes = [
  {
    date: 'July 2026',
    items: [
      'Forum threads now appear in search results alongside wiki pages',
      'Forum threads are sent to the AI when you Ask a question',
      'AI Overview and result sections are collapsible',
      'Search now finds threads by forum name and category too',
      'Sites section shows before Wiki and Forum in search results',
      'Home page autocomplete shows forum threads as suggestions',
      'Forum scraper imported 25000+ threads from DemocracyCraft forums',
    ],
  },
  {
    date: 'June 2026',
    items: [
      'Sidebars on the home page stay fixed when you scroll',
      'Center content area made wider',
    ],
  },
];

export default function Changelog() {
  const { user } = useAuth();

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">What has changed on Z&E Net</p>

        <div className="space-y-8">
          {changes.map((entry, i) => (
            <div key={i}>
              <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{entry.date}</h2>
              <ul className="space-y-3">
                {entry.items.map((item, j) => (
                  <li key={j} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
