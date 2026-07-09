import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import Footer from '../components/Footer';
import AdminButton from '../components/AdminButton';

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('balance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${activeTab}`);
      const json = await res.json();
      setData(json.leaderboard || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

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
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Leaderboards</h1>
          <p className="text-neutral-500">Top performers across the platform</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {[
            { id: 'balance', label: '💰 Richest Users' },
            { id: 'views', label: '👁️ Most Viewed Sites' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 hover:border-orange-500/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-neutral-500">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">No data yet</div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-white/5">
              {data.map((entry, i) => (
                <div
                  key={entry.userId || entry.slug || i}
                  onClick={() => entry.slug && navigate(`/site/${entry.slug}`)}
                  className={`flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                    entry.slug ? 'cursor-pointer' : ''
                  } ${i < 3 ? 'bg-gradient-to-r from-orange-500/5 to-transparent' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold w-12 text-center ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-neutral-500'
                    }`}>
                      {getMedal(i)}
                    </div>
                    <div>
                      <p className="font-semibold">{entry.name}</p>
                      {entry.slug && <p className="text-xs text-neutral-500 font-mono">{entry.slug}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-500">
                      {activeTab === 'balance' ? `$${Number(entry.value).toFixed(2)}` : entry.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {activeTab === 'balance' ? 'Balance' : 'Views'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
