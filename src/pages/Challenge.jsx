import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Challenge() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [challenge, setChallenge] = useState(null);
  const [progress, setProgress] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchChallenge(); }, [user]);

  const fetchChallenge = async () => {
    try {
      const url = user ? `/api/app?action=daily-challenge&userId=${user.id}` : '/api/app?action=daily-challenge';
      const res = await fetch(url);
      const data = await res.json();
      setChallenge(data.challenge);
      setProgress(data.progress || []);
      setCompleted(data.completed || false);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Daily Challenge</h1>
        {loading ? <div className="text-center">Loading...</div> : challenge ? (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-2">{challenge.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{challenge.description}</p>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span className="text-blue-500">{progress.length} / {challenge.target_count}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${challenge.target_count ? Math.min(100, (progress.length / challenge.target_count) * 100) : 0}%` }}></div>
              </div>
            </div>
            {completed && <div className="mt-4 text-green-500 font-bold">✓ COMPLETED</div>}
          </div>
        ) : <div className="text-center">No challenge available today.</div>}
      </main>
    </Layout>
  );
}
