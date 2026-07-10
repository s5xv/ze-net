import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Footer from '../components/Footer';
import AdminButton from '../components/AdminButton';

export default function WikiFinder({ user }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [target, setTarget] = useState(null);
  const [guess, setGuess] = useState('');
  const [hints, setHints] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [allPages, setAllPages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && !target && allPages.length > 0) {
      startNewRound();
    }
  }, [allPages, gameState]);

  const loadPages = async () => {
    const { data } = await supabase
      .from('wiki_pages')
      .select('title, category, content')
      .neq('category', 'Category')
      .limit(500);
    setAllPages(data || []);
  };

  const startNewRound = () => {
    if (allPages.length === 0) return;
    const randomPage = allPages[Math.floor(Math.random() * allPages.length)];
    setTarget(randomPage);
    setGuess('');
    setAttempts(0);
    setGameState('playing');
    
    // Generate hints
    const newHints = [];
    if (randomPage.category && randomPage.category !== 'General') {
      newHints.push(`Category: ${randomPage.category}`);
    }
    newHints.push(`Title length: ${randomPage.title.length} characters`);
    newHints.push(`Starts with: "${randomPage.title[0].toUpperCase()}"`);
    if (randomPage.content) {
      const words = randomPage.content.split(/\s+/);
      if (words.length > 10) {
        newHints.push(`Contains ${words.length} words`);
      }
    }
    setHints(newHints);
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || !target) return;

    setAttempts(prev => prev + 1);

    const guessLower = guess.trim().toLowerCase();
    const targetLower = target.title.toLowerCase();

    if (guessLower === targetLower) {
      const points = Math.max(10, 50 - attempts * 5);
      setScore(prev => prev + points);
      setGameState('won');
    } else if (attempts >= 7) {
      setGameState('lost');
    } else {
      // Add progressive hint
      const revealed = target.title.split('').map((char, i) => {
        if (i < attempts + 1 || char === ' ') return char;
        return '_';
      }).join('');
      setHints(prev => [...prev, `Revealed: ${revealed}`]);
      setGuess('');
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setGuess(val);
    
    if (val.length >= 2) {
      const matches = allPages
        .filter(p => p.title.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const nextRound = () => {
    setRound(prev => prev + 1);
    startNewRound();
  };

  return (
    <Layout user={user}>
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        {user && <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>}
        {user && <AdminButton />}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-4xl font-bold mb-2">Wiki Finder</h1>
          <p className="text-neutral-500">Guess the DemocracyCraft wiki page!</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <div className="bg-white dark:bg-[#111111] rounded-xl px-6 py-3 border border-neutral-200 dark:border-white/5">
            <p className="text-xs text-neutral-500">Round</p>
            <p className="text-2xl font-bold text-orange-500">{round}</p>
          </div>
          <div className="bg-white dark:bg-[#111111] rounded-xl px-6 py-3 border border-neutral-200 dark:border-white/5">
            <p className="text-xs text-neutral-500">Score</p>
            <p className="text-2xl font-bold text-orange-500">{score}</p>
          </div>
          <div className="bg-white dark:bg-[#111111] rounded-xl px-6 py-3 border border-neutral-200 dark:border-white/5">
            <p className="text-xs text-neutral-500">Attempts</p>
            <p className="text-2xl font-bold text-orange-500">{attempts}/8</p>
          </div>
        </div>

        {target && gameState === 'playing' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 mb-6">
            <h2 className="text-lg font-bold mb-4">Hints:</h2>
            <ul className="space-y-2">
              {hints.map((hint, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-orange-500">💡</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleGuess} className="mt-6 relative">
              <input
                type="text"
                value={guess}
                onChange={handleInputChange}
                placeholder="Type your guess..."
                className="w-full px-4 py-3 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-orange-500"
                autoFocus
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-lg overflow-hidden z-10">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setGuess(s.title); setSuggestions([]); }}
                      className="block w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                className="mt-3 w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Submit Guess
              </button>
            </form>
          </div>
        )}

        {gameState === 'won' && (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-8 text-center mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2 text-green-500">Correct!</h2>
            <p className="text-lg mb-4">The answer was: <strong className="text-orange-500">{target.title}</strong></p>
            <p className="text-sm text-neutral-500 mb-6">+{Math.max(10, 50 - attempts * 5)} XP earned!</p>
            <button
              onClick={nextRound}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Next Round →
            </button>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-8 text-center mb-6">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-3xl font-bold mb-2 text-red-500">Out of Attempts!</h2>
            <p className="text-lg mb-4">The answer was: <strong className="text-orange-500">{target.title}</strong></p>
            <button
              onClick={nextRound}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again →
            </button>
          </div>
        )}

        {!target && allPages.length === 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl p-8 border border-neutral-200 dark:border-white/5 text-center">
            <p className="text-neutral-500 mb-4">No wiki pages loaded yet.</p>
            <a href="/wiki" className="text-orange-500 hover:underline">Go sync the wiki first →</a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
