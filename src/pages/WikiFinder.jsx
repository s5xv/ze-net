import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function WikiFinder() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [target, setTarget] = useState(null);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRandomPage();
  }, []);

  const loadRandomPage = async () => {
    const { data } = await supabase.from('wiki_pages').select('*').not('content', 'is', null).limit(1000);
    if (data && data.length > 0) {
      setTarget(data[Math.floor(Math.random() * data.length)]);
      setMessage('');
      setGuess('');
    }
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!target) return;
    if (guess.toLowerCase().trim() === target.title.toLowerCase()) {
      setScore(s => s + 10);
      setMessage('✓ Correct! +10 points');
      setTimeout(loadRandomPage, 1500);
    } else {
      setMessage('✗ Wrong! Try again');
    }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Wiki Finder</h1>
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
          <p className="text-xl font-bold mb-4">Score: {score}</p>
          {target && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Hint: Category is {target.category}</p>
              <p className="text-sm text-gray-500">Title length: {target.title.length} characters</p>
            </div>
          )}
          <form onSubmit={handleGuess} className="space-y-4">
            <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Guess the wiki page..." className="w-full px-4 py-3 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
            <button type="submit" className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Submit Guess</button>
          </form>
          {message && <p className={`mt-4 text-center font-bold ${message.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </div>
      </main>
    </Layout>
  );
}
