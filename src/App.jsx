import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useEffect } from 'react';
import { supabase } from './services/supabase';

import Home from './pages/Home';
import Search from './pages/Search';
import Login from './pages/Login';
import Account from './pages/Account';
import Admin from './pages/Admin';
import LinkAccount from './pages/LinkAccount';
import NotFound from './pages/NotFound';

function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        console.log('Found auth code, exchanging for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Failed to exchange code:', error);
        } else {
          console.log('Session established successfully');
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/account');
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return null;
}

function App() {
  useTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-neutral-500 font-mono text-sm">INITIALIZING...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/search" element={<Search user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account user={user} />} />
        <Route path="/admin" element={<Admin user={user} />} />
        <Route path="/link-account" element={<LinkAccount user={user} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
