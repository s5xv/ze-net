import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

import Home from './pages/Home';
import Search from './pages/Search';
import Login from './pages/Login';
import LinkAccount from './pages/LinkAccount';
import Category from './pages/Category';
import Account from './pages/Account';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

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
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/search" element={<Search user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/link-account" element={<LinkAccount user={user} />} />
        <Route path="/category/:category" element={<Category user={user} />} />
        <Route path="/account" element={<Account user={user} />} />
        <Route path="/admin" element={<Admin user={user} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
