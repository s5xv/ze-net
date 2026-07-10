import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Docs() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const faqs = [
    { q: "What is Z&E Net?", a: "Z&E Net is an independent search directory for DemocracyCraft. It helps you find sites, wiki pages, and community resources quickly." },
    { q: "How do I add my site?", a: "Contact an admin through the Contact page or submit a site request. Once approved, your site will be listed." },
    { q: "How does 'I'm Feeling Lucky' work?", a: "It takes you to a random site or wiki page from our directory. Great for discovering new places!" },
    { q: "What are shortcuts?", a: "Shortcuts are quick codes for sites. For example, typing 'rvr' might take you directly to Riviere Reserve." },
    { q: "How do I become a site owner?", a: "When a site is added, the admin can assign it to your Discord ID. Once you sign in with that Discord account, you'll automatically get management access." },
    { q: "Is this official?", a: "No. Z&E Net is an independent project and is not affiliated with DemocracyCraft." },
    { q: "How do I link my Minecraft account?", a: "Go to your Account page and click 'Link MC Account'. Follow the instructions to verify ownership." },
    { q: "What are Daily Challenges?", a: "Every day, we post a new challenge (e.g., 'Visit 3 Government sites'). Complete them to earn achievements!" }
  ];

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8">Docs & FAQ</h1>
        
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Use the search bar to find sites and wiki pages</li>
            <li>Click "I'm Feeling Lucky" to discover random content</li>
            <li>Sign in with Discord to bookmark sites and earn achievements</li>
            <li>Link your Minecraft account to track deposits</li>
          </ul>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-2 text-blue-600 dark:text-blue-400">{faq.q}</h3>
              <p className="text-gray-700 dark:text-gray-300">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
