import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LinkAccount() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [code, setCode] = useState('');
  const [linked, setLinked] = useState(false);

  const generateCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCode(newCode);
  };

  const checkLink = async () => {
    if (!code) return;
    const { data } = await supabase.from('treasury_tokens').select('id').eq('user_id', user.id).eq('token', code).single();
    if (data) {
      setLinked(true);
      alert('Account linked successfully!');
    } else {
      alert('Code not found. Did you pay in-game?');
    }
  };

  if (!user) return <Layout user={user}><div className="p-8 text-center">Please sign in</div></Layout>;

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm text-center">
          <h1 className="text-3xl font-bold mb-4">Link Minecraft Account</h1>
          {linked ? (
            <div className="text-green-500 text-xl font-bold">Account Linked!</div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Click generate, then run <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/paya business ZEN {code || 'CODE'}</code> in-game to link.</p>
              <div className="flex flex-col gap-4 items-center">
                <button onClick={generateCode} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Generate Code</button>
                {code && <div className="text-2xl font-mono font-bold text-blue-600">{code}</div>}
                {code && <button onClick={checkLink} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">I've Paid In-Game</button>}
              </div>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
