import { useState, useEffect, useRef } from 'react';
import { Button } from '../UI';

export default function Stopwatch() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 10);
      }, 10);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Stopwatch</h3>
      <div className="text-5xl font-mono font-bold text-blue-400 mb-6 text-center">
        {formatTime(time)}
      </div>
      <div className="flex gap-3 justify-center">
        <Button 
          variant={running ? 'secondary' : 'primary'} 
          onClick={() => setRunning(!running)}
        >
          {running ? 'Stop' : 'Start'}
        </Button>
        <Button variant="outline" onClick={() => { setRunning(false); setTime(0); }}>
          Reset
        </Button>
      </div>
    </div>
  );
}
