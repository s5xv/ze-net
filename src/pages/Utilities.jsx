import Footer from '../components/Footer';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from './hooks/useTheme';
import AdminButton from '../components/AdminButton';

export default function Utilities({ user }) {
  const { isDark, toggleTheme } = useTheme();
  const [activeTool, setActiveTool] = useState('calculator');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        {user && <a href="/account" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">ACCOUNT</a>}
        {user && <AdminButton />}
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Utilities</h1>

        {/* Tool Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['calculator', 'stopwatch', 'currency', 'unit', 'dice', 'password', 'timer'].map((tool) => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTool === tool
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-orange-500/50'
              }`}
            >
              {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </button>
          ))}
        </div>

        {/* Tool Content */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl p-6">
          {activeTool === 'calculator' && <Calculator />}
          {activeTool === 'stopwatch' && <Stopwatch />}
          {activeTool === 'currency' && <CurrencyConverter />}
          {activeTool === 'unit' && <UnitConverter />}
          {activeTool === 'dice' && <DiceRoller />}
          {activeTool === 'password' && <PasswordGenerator />}
          {activeTool === 'timer' && <CountdownTimer />}
        </div>
      </main>
    </div>
  );
}

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleInput = (val) => {
    if (val === '=') {
      try {
        const result = Function('"use strict"; return (' + equation + ')')();
        setDisplay(String(result));
        setEquation(String(result));
      } catch {
        setDisplay('Error');
        setEquation('');
      }
    } else if (val === 'C') {
      setDisplay('0');
      setEquation('');
    } else {
      setEquation(equation + val);
      setDisplay(equation + val);
    }
  };

  const buttons = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Calculator</h2>
      <div className="bg-neutral-900 text-green-400 font-mono text-2xl p-4 rounded-lg mb-4 text-right min-h-[60px]">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => handleInput(btn)}
            className={`p-4 rounded-lg font-mono text-lg transition-colors ${
              btn === '=' ? 'bg-orange-500 hover:bg-orange-600 text-white col-span-2' :
              btn === 'C' ? 'bg-red-600 hover:bg-red-700 text-white' :
              ['+','-','*','/'].includes(btn) ? 'bg-blue-600 hover:bg-blue-700 text-white' :
              'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stopwatch() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setTime(t => t + 10), 10);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(centiseconds).padStart(2,'0')}`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Stopwatch</h2>
      <div className="bg-neutral-900 text-green-400 font-mono text-5xl p-8 rounded-lg mb-4 text-center">
        {formatTime(time)}
      </div>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setRunning(!running)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            running ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {running ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={() => { setRunning(false); setTime(0); }}
          className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-lg font-medium transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function CurrencyConverter() {
  const [amount, setAmount] = useState(1);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [result, setResult] = useState(null);

  // Mock rates - in production, fetch from API
  const rates = {
    USD: { EUR: 0.92, GBP: 0.79, JPY: 149.5, CAD: 1.36, AUD: 1.52 },
    EUR: { USD: 1.09, GBP: 0.86, JPY: 162.5, CAD: 1.48, AUD: 1.65 },
    GBP: { USD: 1.27, EUR: 1.16, JPY: 189.2, CAD: 1.73, AUD: 1.92 },
  };

  const convert = () => {
    if (from === to) {
      setResult(amount);
    } else if (rates[from] && rates[from][to]) {
      setResult((amount * rates[from][to]).toFixed(2));
    } else {
      setResult('Rate not available');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Currency Converter</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="col-span-1 px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg"
          />
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg">
            <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>CAD</option><option>AUD</option>
          </select>
          <button onClick={convert} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Convert</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 px-3 py-2 bg-neutral-900 text-green-400 font-mono rounded-lg text-center">
            {result !== null ? result : '—'}
          </div>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg">
            <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>CAD</option><option>AUD</option>
          </select>
          <div></div>
        </div>
      </div>
    </div>
  );
}

function UnitConverter() {
  const [value, setValue] = useState(1);
  const [fromUnit, setFromUnit] = useState('meters');
  const [toUnit, setToUnit] = useState('feet');

  const conversions = {
    meters: { feet: 3.28084, yards: 1.09361, km: 0.001, miles: 0.000621371, cm: 100 },
    feet: { meters: 0.3048, yards: 0.333333, km: 0.0003048, miles: 0.000189394, cm: 30.48 },
    kg: { lbs: 2.20462, oz: 35.274, g: 1000, tons: 0.001 },
    lbs: { kg: 0.453592, oz: 16, g: 453.592, tons: 0.0005 },
    celsius: { fahrenheit: (v) => v * 9/5 + 32, kelvin: (v) => v + 273.15 },
    fahrenheit: { celsius: (v) => (v - 32) * 5/9, kelvin: (v) => (v - 32) * 5/9 + 273.15 },
  };

  const convert = () => {
    if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
      const conv = conversions[fromUnit][toUnit];
      return typeof conv === 'function' ? conv(value).toFixed(2) : (value * conv).toFixed(4);
    }
    return 'N/A';
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Unit Converter</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg" />
          <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg">
            <option value="meters">Meters</option><option value="feet">Feet</option>
            <option value="kg">Kilograms</option><option value="lbs">Pounds</option>
            <option value="celsius">Celsius</option><option value="fahrenheit">Fahrenheit</option>
          </select>
        </div>
        <div className="text-center text-2xl">→</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 bg-neutral-900 text-green-400 font-mono rounded-lg text-center">{convert()}</div>
          <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg">
            <option value="feet">Feet</option><option value="meters">Meters</option>
            <option value="lbs">Pounds</option><option value="kg">Kilograms</option>
            <option value="fahrenheit">Fahrenheit</option><option value="celsius">Celsius</option>
            <option value="km">Kilometers</option><option value="miles">Miles</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function DiceRoller() {
  const [numDice, setNumDice] = useState(1);
  const [sides, setSides] = useState(6);
  const [results, setResults] = useState([]);

  const roll = () => {
    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * sides) + 1);
    setResults(rolls);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dice Roller</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-sm mb-1">Number of dice</label>
          <input type="number" min="1" max="10" value={numDice} onChange={(e) => setNumDice(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm mb-1">Sides</label>
          <select value={sides} onChange={(e) => setSides(parseInt(e.target.value))} className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg">
            <option value="4">d4</option><option value="6">d6</option><option value="8">d8</option>
            <option value="10">d10</option><option value="12">d12</option><option value="20">d20</option><option value="100">d100</option>
          </select>
        </div>
      </div>
      <button onClick={roll} className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium mb-4">
        🎲 Roll!
      </button>
      {results.length > 0 && (
        <div className="bg-neutral-900 p-4 rounded-lg">
          <div className="flex flex-wrap gap-2 mb-2">
            {results.map((r, i) => (
              <span key={i} className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-500 font-mono text-lg rounded-lg">
                {r}
              </span>
            ))}
          </div>
          <div className="text-sm text-neutral-400">Total: <span className="text-orange-500 font-bold">{results.reduce((a, b) => a + b, 0)}</span></div>
        </div>
      )}
    </div>
  );
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState('');

  const generate = () => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (includeUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    alert('Copied to clipboard!');
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Password Generator</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Length: {length}</label>
          <input type="range" min="8" max="64" value={length} onChange={(e) => setLength(parseInt(e.target.value))} className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={includeUpper} onChange={(e) => setIncludeUpper(e.target.checked)} /> Uppercase (A-Z)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)} /> Numbers (0-9)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={includeSymbols} onChange={(e) => setIncludeSymbols(e.target.checked)} /> Symbols (!@#$)</label>
        </div>
        <button onClick={generate} className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium">
          Generate Password
        </button>
        {password && (
          <div className="bg-neutral-900 p-4 rounded-lg">
            <div className="font-mono text-green-400 break-all mb-2">{password}</div>
            <button onClick={copyToClipboard} className="text-sm text-orange-500 hover:underline">Copy to clipboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CountdownTimer() {
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setRunning(false);
      alert('Time is up!');
    }
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft]);

  const start = () => { setTimeLeft(duration); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setTimeLeft(duration); };

  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Countdown Timer</h2>
      <div className="bg-neutral-900 text-green-400 font-mono text-6xl p-8 rounded-lg mb-4 text-center">
        {formatTime(timeLeft)}
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-1">Duration (seconds)</label>
        <input type="number" value={duration} onChange={(e) => { setDuration(parseInt(e.target.value)); setTimeLeft(parseInt(e.target.value)); }} className="w-full px-3 py-2 bg-neutral-100 dark:bg-[#09090b] border border-neutral-200 dark:border-white/10 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {!running ? (
          <button onClick={start} className="flex-grow px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Start</button>
        ) : (
          <button onClick={pause} className="flex-grow px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium">Pause</button>
        )}
        <button onClick={reset} className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-lg font-medium">Reset</button>
      </div>
    </div>
  );
}
