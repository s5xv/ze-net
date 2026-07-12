import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Leaderboard() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('balance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app?action=leaderboard&type=${activeTab}`);
      const json = await res.json();
      setData(json.leaderboard || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Leaderboards</h1>
        <div className="flex gap-2 mb-6 justify-center">
          <button onClick={() => setActiveTab('balance')} className={`px-5 py-2 rounded-lg ${activeTab === 'balance' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#303134]'}`}>Richest Users</button>
          <button onClick={() => setActiveTab('views')} className={`px-5 py-2 rounded-lg ${activeTab === 'views' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#303134]'}`}>Most Viewed Sites</button>
        </div>
        <div className="bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? <div className="p-12 text-center">Loading...</div> : data.length === 0 ? <div className="p-12 text-center">No data yet</div> : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-12 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{activeTab === 'balance' ? `$${Number(entry.value || 0).toFixed(2)}` : (entry.value || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
