import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Utilities() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTool, setActiveTool] = useState('Calculator');

  // --- Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const calcResult = (expr) => {
    const tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g);
    if (!tokens || tokens.join('') !== expr.replace(/\s/g, '')) throw new Error('Invalid');
    const output = [], ops = [];
    const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const apply = () => { const o = ops.pop(), b = output.pop(), a = output.pop(); if (o === '+') output.push(a + b); else if (o === '-') output.push(a - b); else if (o === '*') output.push(a * b); else if (o === '/') output.push(a / b); };
    for (const t of tokens) {
      if (/\d/.test(t)) { output.push(parseFloat(t)); }
      else if (t === '(') { ops.push(t); }
      else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') apply(); ops.pop(); }
      else { while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[t]) apply(); ops.push(t); }
    }
    while (ops.length) apply();
    return output[0];
  };

  const handleCalc = (val) => {
    if (val === 'C') setCalcDisplay('0');
    else if (val === '=') {
      try { const r = calcResult(calcDisplay); setCalcDisplay(Number.isFinite(r) ? r.toString() : 'Error'); } catch { setCalcDisplay('Error'); }
    } else {
      setCalcDisplay(calcDisplay === '0' ? val : calcDisplay + val);
    }
  };

  // --- Stopwatch State ---
  const [swTime, setSwTime] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  useEffect(() => {
    let interval;
    if (swRunning) interval = setInterval(() => setSwTime(t => t + 1), 10);
    return () => clearInterval(interval);
  }, [swRunning]);
  const formatTime = (ms) => {
    const mins = Math.floor(ms / 6000);
    const secs = Math.floor((ms % 6000) / 100);
    const centis = ms % 100;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // --- Dice Roller State ---
  const [diceResult, setDiceResult] = useState(null);
  const rollDice = () => setDiceResult(Math.floor(Math.random() * 6) + 1);

  // --- Password Generator State ---
  const [password, setPassword] = useState('');
  const [passLength, setPassLength] = useState(16);
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let result = '';
    for (let i = 0; i < passLength; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(result);
  };

  // --- Panda Clicker State ---
  const [pandaClicks, setPandaClicks] = useState(0);
  const [pandaScale, setPandaScale] = useState(1);
  const pandaTimeout = useRef(null);
  useEffect(() => { return () => clearTimeout(pandaTimeout.current); }, []);
  const handlePandaClick = () => {
    setPandaClicks(c => c + 1);
    setPandaScale(1.2);
    pandaTimeout.current = setTimeout(() => setPandaScale(1), 100);
  };

  const tools = ['Calculator', 'Stopwatch', 'Dice Roller', 'Password Generator', 'Panda Clicker'];

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Utilities</h1>
        
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {tools.map((tool) => (
            <button 
              key={tool} 
              onClick={() => setActiveTool(tool)} 
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTool === tool 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-[#303134] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3c4043]'
              }`}
            >
              {tool}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm min-h-[400px] flex items-center justify-center">
          
          {activeTool === 'Calculator' && (
            <div className="w-full max-w-xs">
              <div className="bg-gray-100 dark:bg-[#202124] p-4 rounded-lg mb-4 text-right text-3xl font-mono overflow-hidden">{calcDisplay}</div>
              <div className="grid grid-cols-4 gap-2">
                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'].map(btn => (
                  <button key={btn} onClick={() => handleCalc(btn)} className={`p-4 rounded-lg font-bold text-lg ${btn === '=' ? 'bg-blue-600 text-white col-span-2' : btn === 'C' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-[#202124] hover:bg-gray-300 dark:hover:bg-[#3c4043]'}`}>{btn}</button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'Stopwatch' && (
            <div className="text-center">
              <div className="text-6xl font-mono font-bold mb-8 text-blue-600 dark:text-blue-400">{formatTime(swTime)}</div>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setSwRunning(!swRunning)} className={`px-8 py-3 rounded-lg font-bold text-lg ${swRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                  {swRunning ? 'Pause' : 'Start'}
                </button>
                <button onClick={() => { setSwRunning(false); setSwTime(0); }} className="px-8 py-3 rounded-lg font-bold text-lg bg-red-500 hover:bg-red-600 text-white">Reset</button>
              </div>
            </div>
          )}

          {activeTool === 'Dice Roller' && (
            <div className="text-center">
              <div className="text-9xl mb-8 animate-bounce">{diceResult ? ['⚀','⚁','⚂','⚃','⚄','⚅'][diceResult-1] : '🎲'}</div>
              {diceResult && <div className="text-2xl font-bold mb-8">You rolled a {diceResult}!</div>}
              <button onClick={rollDice} className="px-8 py-3 rounded-lg font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white">Roll Dice</button>
            </div>
          )}

          {activeTool === 'Password Generator' && (
            <div className="w-full max-w-md text-center">
              <div className="bg-gray-100 dark:bg-[#202124] p-4 rounded-lg mb-6 font-mono text-lg break-all min-h-[60px] flex items-center justify-center">{password || 'Click generate...'}</div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Length: {passLength}</label>
                <input type="range" min="8" max="64" value={passLength} onChange={(e) => setPassLength(parseInt(e.target.value))} className="w-full" />
              </div>
              <button onClick={generatePassword} className="px-8 py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white">Generate Password</button>
            </div>
          )}

          {activeTool === 'Panda Clicker' && (
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Pandas Clicked</div>
              <div className="text-6xl font-bold mb-8 text-blue-600 dark:text-blue-400">{pandaClicks}</div>
              <button 
                onClick={handlePandaClick} 
                className="text-9xl transition-transform duration-100 focus:outline-none select-none"
                style={{ transform: `scale(${pandaScale})` }}
              >
                🐼
              </button>
              <p className="text-sm text-gray-500 mt-4">Click the panda!</p>
            </div>
          )}

        </div>
      </main>
    </Layout>
  );
}
