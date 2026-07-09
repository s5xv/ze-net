import Footer from '../components/Footer';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import AdminButton from '../components/AdminButton';

export default function Challenge({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [challenge, setChallenge] = useState(null);
  const [progress, setProgress] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenge();
  }, [user]);

  const fetchChallenge = async () => {
    try {
      const url = user ? `/api/daily-challenge?userId=${user.id}` : '/api/daily-challenge';
      const res = await fetch(url);
      const data = await res.json();
      setChallenge(data.challenge);
      setProgress(data.progress || []);
      setCompleted(data.completed || false);
    } catch (err) {
      console.error('Failed to fetch challenge', err);
    } finally {
      setLoading(false);
    }
  };

  const markSiteVisited = async (siteId) => {
    if (!user || !challenge) return;
    
    // Check if already marked
    if (progress.find(p => p.site_id === siteId)) return;
    
    await supabase.from('challenge_progress').insert({
      user_id: user.id,
      challenge_id: challenge.id,
      site_id: siteId
    });
    
    fetchChallenge();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-neutral-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        {user && <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>}
        {user && <AdminButton />}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-orange-500/10 rounded-full mb-4">
            <span className="text-5xl">🎯</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Daily Challenge</h1>
          <p className="text-neutral-500">New challenge every day!</p>
        </div>

        {challenge && (
          <div className="bg-gradient-to-br from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{challenge.title}</h2>
                <p className="text-neutral-600 dark:text-neutral-400">{challenge.description}</p>
              </div>
              {completed && (
                <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">✓ COMPLETED</span>
              )}
            </div>
            
            <div className="bg-neutral-900 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Progress</span>
                <span className="text-sm font-mono text-orange-500">{progress.length} / {challenge.target_count}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all"
                  style={{ width: `${Math.min(100, (progress.length / challenge.target_count) * 100)}%` }}
                ></div>
              </div>
            </div>

            {progress.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Sites Visited</h3>
                {progress.map((p) => (
                  <div 
                    key={p.site_id}
                    onClick={() => navigate(`/site/${p.sites.slug}`)}
                    className="p-3 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors"
                  >
                    <span className="font-medium">{p.sites.name}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate(`/search?category=${challenge.target_category}`)}
              className="mt-4 w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Find {challenge.target_category} Sites →
            </button>
          </div>
        )}

        {!user && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
            <p className="mb-4">Sign in to track your progress and earn achievements!</p>
            <a href="/login" className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors inline-block">
              Sign in with Discord
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
