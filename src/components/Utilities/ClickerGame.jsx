import { useState, useEffect } from 'react';
import { Button } from '../UI';

export default function ClickerGame() {
  const [count, setCount] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [autoClickers, setAutoClickers] = useState(0);

  useEffect(() => {
    if (autoClickers === 0) return;
    const interval = setInterval(() => setCount(c => c + autoClickers), 1000);
    return () => clearInterval(interval);
  }, [autoClickers]);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Red Panda Clicker</h3>
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-amber-400 mb-2">
          {count.toLocaleString()} cookies
        </div>
        <p className="text-sm text-gray-500">per second: {autoClickers}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button 
          variant="primary" 
          onClick={() => setCount(c => c + clickPower)}
          className="py-4 text-lg"
        >
          Click the Panda!
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (count >= 10) {
              setCount(c => c - 10);
              setClickPower(p => p + 1);
            }
          }}
          disabled={count < 10}
        >
          Upgrade Click (+1) - 10 cookies
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (count >= 50) {
              setCount(c => c - 50);
              setAutoClickers(a => a + 1);
            }
          }}
          disabled={count < 50}
        >
          Buy Auto-Clicker - 50 cookies
        </Button>
      </div>
    </div>
  );
}
