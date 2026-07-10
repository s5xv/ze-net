import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Utilities() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTool, setActiveTool] = useState('calculator');

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8">Utilities</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          {['calculator', 'stopwatch', 'currency', 'unit', 'dice', 'password', 'timer'].map((tool) => (
            <button key={tool} onClick={() => setActiveTool(tool)} className={`px-4 py-2 rounded-lg ${activeTool === tool ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#303134]'}`}>{tool}</button>
          ))}
        </div>
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          {activeTool === 'calculator' && <div className="text-center text-gray-500">Calculator coming soon...</div>}
          {activeTool === 'stopwatch' && <div className="text-center text-gray-500">Stopwatch coming soon...</div>}
          {activeTool === 'currency' && <div className="text-center text-gray-500">Currency converter coming soon...</div>}
          {activeTool === 'unit' && <div className="text-center text-gray-500">Unit converter coming soon...</div>}
          {activeTool === 'dice' && <div className="text-center text-gray-500">Dice roller coming soon...</div>}
          {activeTool === 'password' && <div className="text-center text-gray-500">Password generator coming soon...</div>}
          {activeTool === 'timer' && <div className="text-center text-gray-500">Timer coming soon...</div>}
        </div>
      </main>
    </Layout>
  );
}
