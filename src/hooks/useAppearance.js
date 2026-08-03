import { useEffect, useState } from 'react';

const ACCENT_KEY = 'zenet_accent_color';
const BIGTEXT_KEY = 'zenet_big_text';

export function useAppearance() {
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) || '#3b82f6');
  const [bigText, setBigText] = useState(() => localStorage.getItem(BIGTEXT_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(ACCENT_KEY, accent);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
  }, [accent]);

  useEffect(() => {
    localStorage.setItem(BIGTEXT_KEY, bigText ? '1' : '0');
    document.documentElement.classList.toggle('big-text', bigText);
  }, [bigText]);

  return { accent, setAccent, bigText, setBigText };
}
