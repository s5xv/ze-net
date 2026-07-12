import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [balance, setBalance] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [mySites, setMySites] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setBalance(0);
      setBookmarks([]);
      setMySites([]);
      return;
    }

    // Fetch balance
    const fetchBalance = async () => {
      const { data } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      setBalance(data?.balance || 0);
    };

    fetchBalance();
    
    // Also fetch on route change
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('bookmarks')
        .select('*, sites(id, name, url)')
        .eq('user_id', user.id)
        .then(({ data }) => setBookmarks(data || []));

      supabase
        .from('sites')
        .select('id, name, url, slug, is_verified')
        .eq('user_id', user.id)
        .then(({ data }) => setMySites(data || []));
    }
  }, [user?.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;

  const goTo = (path) => {
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1b1e] text-white">
      <header className="bg-[#25262b] border-b border-gray-800 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/assets/logo.png" alt="" className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold">
              <span className="text-white">Z&E</span>
              <span className="text-blue-500 ml-2">NET</span>
            </h1>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/account')}
                className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 rounded-lg text-green-400 text-sm font-bold transition"
              >
                ${balance.toFixed(2)}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded-lg transition"
                >
                  <img src={avatarUrl} alt="avatar" className="w-7 h-7 rounded-full" />
                  <svg className={`w-4 h-4 transition ${dropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#303134] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 bg-[#202124] border-b border-gray-700">
                      <p className="text-white text-sm font-bold truncate">{displayName}</p>
                      <button onClick={() => navigate(`/profile/${user.id}`)} className="text-xs text-blue-400 hover:underline text-left mt-1">
                        View Profile
                      </button>
                    </div>

                    <div className="py-1">
                      <button onClick={() => navigate('/account')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Wallet</button>
                      <button onClick={() => navigate('/collections')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Collections</button>
                      <button onClick={() => navigate(`/profile/${user.id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">My Profile</button>
                    </div>

                    {bookmarks.length > 0 && (
                      <>
                        <div className="border-t border-gray-700 px-4 py-2 bg-gray-800">
                          <p className="text-xs text-gray-500 font-semibold uppercase">Bookmarks</p>
                        </div>
                        <div className="max-h-32 overflow-y-auto py-1">
                          {bookmarks.map((bm, idx) => (
                            <button key={idx} onClick={() => goTo(bm.sites?.url || '/')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 truncate">
                              {bm.sites?.name || 'Site'}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {mySites.length > 0 && (
                      <>
                        <div className="border-t border-gray-700 px-4 py-2 bg-gray-800">
                          <p className="text-xs text-gray-500 font-semibold uppercase">My Sites</p>
                        </div>
                        <div className="max-h-32 overflow-y-auto py-1">
                          {mySites.map(site => (
                            <button key={site.id} onClick={() => goTo(site.url || `/site/${site.slug}`)} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 truncate">
                              {site.is_verified ? '✓ ' : ''}{site.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="border-t border-gray-700 py-1">
                      <button onClick={() => navigate('/submit-ad')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Submit Ad</button>
                      <button onClick={() => navigate('/verify-site')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Verify Site</button>
                      <button onClick={() => navigate('/admin')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Admin Panel</button>
                      <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 border-t border-gray-700">Logout</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">
              Login with Discord
            </button>
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
