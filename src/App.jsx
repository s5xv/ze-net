import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { lazy, Suspense, useEffect } from 'react';
import { supabase } from './services/supabase';
import ErrorBoundary from './components/ErrorBoundary';

import Admin from './pages/Admin';

const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Ask = lazy(() => import('./pages/Ask'));
const Site = lazy(() => import('./pages/Site'));
const SiteManage = lazy(() => import('./pages/SiteManage'));
const Profile = lazy(() => import('./pages/Profile'));
const Collections = lazy(() => import('./pages/Collections'));
const Login = lazy(() => import('./pages/Login'));
const Account = lazy(() => import('./pages/Account'));
const LinkAccount = lazy(() => import('./pages/LinkAccount'));
const MiningGame = lazy(() => import('./pages/MiningGame'));
const WikiFinder = lazy(() => import('./pages/WikiFinder'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Contact = lazy(() => import('./pages/Contact'));
const Departments = lazy(() => import('./pages/Departments'));
const DepartmentDetail = lazy(() => import('./pages/DepartmentDetail'));
const Forums = lazy(() => import('./pages/Forums'));
const ForumThreads = lazy(() => import('./pages/ForumThreads'));
const CreateThread = lazy(() => import('./pages/CreateThread'));
const ForumPost = lazy(() => import('./pages/ForumPost'));
const Wiki = lazy(() => import('./pages/Wiki'));
const Utilities = lazy(() => import('./pages/Utilities'));
const Challenge = lazy(() => import('./pages/Challenge'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Docs = lazy(() => import('./pages/Docs'));
const RegisterBusiness = lazy(() => import('./pages/RegisterBusiness'));
const SubmitAd = lazy(() => import('./pages/SubmitAd'));
const VerifySite = lazy(() => import('./pages/VerifySite'));
const Settings = lazy(() => import('./pages/Settings'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const SiteAnalytics = lazy(() => import('./pages/SiteAnalytics'));
const SubmitSite = lazy(() => import('./pages/SubmitSite'));
const SiteRequests = lazy(() => import('./pages/SiteRequests'));
const SiteEmbed = lazy(() => import('./pages/SiteEmbed'));
const Compare = lazy(() => import('./pages/Compare'));
const NotFound = lazy(() => import('./pages/NotFound'));

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

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#202124] flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthHandler />
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#202124] flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
          <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/search" element={<Search user={user} />} />
          <Route path="/ask" element={<Ask user={user} />} />
          <Route path="/site/:slug" element={<Site user={user} />} />
          <Route path="/site/:slug/manage" element={<SiteManage user={user} />} />
          <Route path="/site/:slug/embed" element={<SiteEmbed />} />
          <Route path="/requests" element={<SiteRequests user={user} />} />
          <Route path="/profile/:userId" element={<Profile user={user} />} />
          <Route path="/collections" element={<Collections user={user} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account user={user} />} />
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="/link-account" element={<LinkAccount user={user} />} />
          <Route path="/mining-game" element={<MiningGame />} />
          <Route path="/wiki-finder" element={<WikiFinder user={user} />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/:slug" element={<DepartmentDetail />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/forums/:forumId" element={<ForumThreads />} />
          <Route path="/wiki" element={<Wiki user={user} />} />
          <Route path="/utilities" element={<Utilities user={user} />} />
          <Route path="/challenge" element={<Challenge user={user} />} />
          <Route path="/achievements" element={<Achievements user={user} />} />
          <Route path="/leaderboard" element={<Leaderboard user={user} />} />
          <Route path="/docs" element={<Docs user={user} />} />
          <Route path="/register-business" element={<RegisterBusiness user={user} />} />
          <Route path="/submit-ad" element={<SubmitAd user={user} />} />
          <Route path="/verify-site" element={<VerifySite user={user} />} />
          <Route path="/submit-site" element={<SubmitSite />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/site/:slug/analytics" element={<SiteAnalytics />} />
          <Route path="/compare" element={<Compare user={user} />} />
          <Route path="/forums/new-thread/:categoryId" element={<CreateThread />} />
          <Route path="/forums/thread/:threadId" element={<ForumPost />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
