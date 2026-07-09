import { useState } from 'react';
import { Header, Footer } from '../components/Layout';
import { Stopwatch, ClickerGame, EasterEggs } from '../components/Utilities';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/UI';

export default function UtilitiesPage() {
  const { user } = useAuth();
  const [showSecret, setShowSecret] = useState(false);

  const handleEasterEgg = (type) => {
    if (type === 'konami') {
      alert('Konami Code Activated! You found the secret!');
      setShowSecret(true);
    } else if (type === 'clicker') {
      alert('You clicked 10 times! Here is a cookie.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header user={user} />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Utilities</h1>
          <p className="text-gray-400">Fun tools and games for DemocracyCraft players</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Stopwatch />
          <ClickerGame />
          
          {/* Placeholder for more utilities */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Coming Soon</h3>
            <p className="text-gray-500 text-sm">More utilities coming to Z&E Net!</p>
          </div>
        </div>

        {showSecret && (
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-2">Secret Unlocked!</h3>
            <p className="text-gray-300">You found the hidden feature! Thanks for exploring.</p>
          </div>
        )}
      </main>
      <Footer />
      <EasterEggs onTrigger={handleEasterEgg} />
    </div>
  );
}
