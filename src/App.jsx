import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useEffect } from 'react';
import { supabase } from './services/supabase';
import ErrorBoundary from './components/ErrorBoundary';

import Home from './pages/Home';
import Search from './pages/Search';
import Site from './pages/Site';
import Login from './pages/Login';
import Account from './pages/Account';
import Admin from './pages/Admin';
import LinkAccount from './pages/LinkAccount';
import MiningGame from './pages/MiningGame';
import Changelog from './pages/Changelog';
import Contact from './pages/Contact';
import Departments from './pages/Departments';
import DepartmentDetail from './pages/DepartmentDetail';
import Forums from './pages/Forums';
import ForumThreads from './pages/ForumThreads';
import Wiki from './pages/Wiki';
import Utilities from './pages/Utilities';
import Challenge from './pages/Challenge';
import NotFound from './pages/NotFound';

function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
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

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-neutral-500 font-mono text-sm">INITIALIZING...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthHandler />
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/search" element={<Search user={user} />} />
          <Route path="/site/:slug" element={<Site user={user} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account user={user} />} />
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="/link-account" element={<LinkAccount user={user} />} />
          <Route path="/mining-game" element={<MiningGame />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/:slug" element={<DepartmentDetail />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/forums/:forumId" element={<ForumThreads />} />
          <Route path="/wiki" element={<Wiki />} />
          <Route path="/utilities" element={<Utilities user={user} />} />
          <Route path="/challenge" element={<Challenge user={user} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
