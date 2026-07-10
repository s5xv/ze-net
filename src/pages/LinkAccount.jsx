import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function LinkAccount() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mcUsername, setMcUsername] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please sign in first');
    setLinking(true);
    try {
      // In a real implementation, this would verify MC ownership
      await supabase.from('treasury_tokens').upsert({ user_id: user.id, account_id: 'pending-verification' });
      alert('Account linked! (Pending verification)');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8">Link Minecraft Account</h1>
        <form onSubmit={handleLink} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minecraft Username</label>
            <input type="text" value={mcUsername} onChange={(e) => setMcUsername(e.target.value)} required className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" placeholder="Your MC username" />
          </div>
          <button type="submit" disabled={linking} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
            {linking ? 'Linking...' : 'Link Account'}
          </button>
        </form>
      </main>
    </Layout>
  );
}
