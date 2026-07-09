import { useState, useEffect } from 'react';
import { EASTER_EGGS } from '../../utils/constants';

export default function EasterEggs({ onTrigger }) {
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = EASTER_EGGS.konamiCode;
      if (e.key === code[konamiIndex]) {
        const newIndex = konamiIndex + 1;
        if (newIndex >= code.length) {
          onTrigger('konami');
          setKonamiIndex(0);
        } else {
          setKonamiIndex(newIndex);
        }
      } else {
        setKonamiIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex, onTrigger]);

  const handleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= EASTER_EGGS.clickCount) {
      onTrigger('clicker');
      setClickCount(0);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="fixed bottom-4 right-4 w-4 h-4 opacity-0 cursor-pointer z-50"
      title="Click me 10 times!"
    />
  );
}
