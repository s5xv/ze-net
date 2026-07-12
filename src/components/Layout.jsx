import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children, user: propUser }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUser = propUser || user;
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      // 1. Fetch live balance for the header so it syncs with Account page
      supabase
        .from('balances')
        .select('balance')
        .eq('user_id', currentUser.id)
        .single()
        .then(({ data }) => {
          if (data) setBalance(data.balance || 0);
        });

      // 2. AUTO-CLAIM OLD SITES
      // Get their Discord username from Supabase Auth metadata
      const discordUsername = currentUser.user_metadata?.user_name || currentUser.user_metadata?.name;
      
      if (discordUsername) {
        // Find unowned sites where the owner_name matches their Discord username
        supabase
          .from('sites')
          .update({ user_id: currentUser.id, owner_user_id: currentUser.id })
          .eq('owner_name', discordUsername)
          .is('user_id', null) // Only claim if not already owned by a logged-in user
          .then(({ error }) => {
            if (error) console.error('Auto-claim error:', error);
          });
      }
    }
  }, [currentUser?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1b1e] text-white">
      <header className="bg-[#25262b] border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
            <span className="text-yellow-500">Z&E</span> <span className="text-blue-500">NET</span>
          </h1>
          <span className="text-sm text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> 105 online
          </span>
          {currentUser && (
            <span className="text-sm text-gray-400">
              Wallet: <span className="text-green-500 font-bold">${balance.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentUser ? (
            <>
              <button onClick={() => navigate('/account')} className="text-sm text-gray-300 hover:text-white">Account</button>
              <button onClick={() => navigate('/profile')} className="text-sm text-gray-300 hover:text-white">Profile</button>
              <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-sm text-red-400 hover:text-red-300">Logout</button>
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Login with Discord</button>
          )}
        </div>
      </header>
      <div className="flex-grow">{children}</div>
      <footer className="bg-[#25262b] border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>Z&E Net is an independent search directory not affiliated with DemocracyCraft.</p>
        <p className="mt-1">© 2026 Z&E Net</p>
      </footer>
    </div>
  );
}
