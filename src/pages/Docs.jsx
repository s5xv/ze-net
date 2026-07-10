import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Docs() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: "What is Z&E Net?", a: "Z&E Net is an independent, community-driven search directory for DemocracyCraft. It indexes sites, wiki pages, and community resources to help you find what you need quickly." },
    { q: "How do I add my site to the directory?", a: "Go to the Contact page and send a request, or ask an admin in the Discord server. Once approved, your site will be listed with its own page." },
    { q: "How does 'I'm Feeling Lucky' work?", a: "It instantly redirects you to a random site or wiki page from our database. It's a great way to discover hidden gems on the server!" },
    { q: "What are Search Shortcuts?", a: "Shortcuts are quick codes assigned to sites. For example, if a site has the shortcut 'rvr', typing 'rvr' in the search bar will instantly find it. Admins can assign these when adding a site." },
    { q: "How do I become a Site Manager?", a: "When a site is added, the admin can assign it to your Discord ID. Once you sign in with that same Discord account, a 'Manage' button will appear on your site's page, giving you full control." },
    { q: "How do I link my Minecraft account for deposits?", a: "Go to your Account page and click 'Link MC Account'. Follow the in-game instructions to verify ownership. Once linked, your in-game deposits will automatically reflect on your Z&E Net balance." },
    { q: "What are Daily Challenges?", a: "Every day, Z&E Net posts a new challenge (e.g., 'Visit 3 Government sites'). Completing them earns you XP and unlocks Achievements on your profile." },
    { q: "Is this site official?", a: "No. Z&E Net is an independent project created by the community. It is not officially affiliated with or endorsed by DemocracyCraft." }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Docs & FAQ</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Everything you need to know about Z&E Net</p>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🚀 Quick Start Guide</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">1. Search</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">Use the main search bar to find sites, wiki pages, or use shortcuts like <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">!gov</code> for categories.</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">2. Sign In</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">Sign in with Discord to bookmark sites, track your balance, and earn achievements.</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">3. Link MC</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">Link your Minecraft account in your profile to enable automatic deposit tracking.</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#202124] rounded-lg">
              <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">4. Explore</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">Use the Wiki, Departments, and Daily Challenges to explore the server.</p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => toggleFaq(i)}
                className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors"
              >
                <span className="font-semibold text-lg">{faq.q}</span>
                <span className="text-2xl text-gray-400 transform transition-transform duration-200" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
