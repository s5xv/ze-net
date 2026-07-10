import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const ADMIN_PASSWORD = 'Khalid124_';

export default function Wiki() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    setIsAdmin(auth === 'true');
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wiki_pages')
      .select('*')
      .neq('category', 'Category')
      .order('title', { ascending: true });
    setPages(data || []);
    setLoading(false);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', 'true');
      setIsAdmin(true);
      setShowPasswordPrompt(false);
    } else {
      alert('Incorrect password');
    }
  };

  const syncWiki = async () => {
    if (!isAdmin) {
      setShowPasswordPrompt(true);
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('/api?endpoint=wiki-scrape&action=all-pages');
      const data = await res.json();
      alert(data.message || 'Wiki synced!');
      await fetchWikiData();
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <Layout user={null}>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">DemocracyCraft Wiki</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-6">
            {pages.length} pages synced
          </p>
          
          <div className="max-w-xl mx-auto mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wiki pages..."
              className="w-full px-6 py-4 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={syncWiki}
            disabled={syncing}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {syncing ? 'Syncing...' : isAdmin ? 'Sync Wiki' : 'Sync Wiki (Admin)'}
          </button>
        </div>

        {/* Admin password prompt */}
        {showPasswordPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Admin Access Required</h3>
              <form onSubmit={handleAdminLogin}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-grow px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Login</button>
                  <button type="button" onClick={() => setShowPasswordPrompt(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No pages found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages.map((page) => (
              <a
                key={page.id}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">{page.title}</h3>
                {page.content ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {page.content.split('\n').filter(p => p.trim().length > 0)[0]?.substring(0, 150)}...
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">This page exists but has no content</p>
                )}
              </a>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
