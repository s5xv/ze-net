import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function MiningGame() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [score, setScore] = useState(0);
  const [mining, setMining] = useState(false);

  const handleMine = () => {
    setMining(true);
    setTimeout(() => {
      const reward = Math.floor(Math.random() * 10) + 1;
      setScore(s => s + reward);
      setMining(false);
    }, 1000);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Mining Game</h1>
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm text-center">
          <p className="text-2xl font-bold mb-4">Score: {score}</p>
          <button onClick={handleMine} disabled={mining} className="px-8 py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg">
            {mining ? 'Mining...' : '⛏️ Mine!'}
          </button>
        </div>
      </main>
    </Layout>
  );
}
