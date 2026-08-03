import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS = [
  ['/', 'Search'],
  ['g', 'Go home'],
  ['s', 'Search sites'],
  ['a', 'Ask AI'],
  ['n', 'News'],
  ['m', 'Marketplace'],
  ['b', 'Leaderboard'],
  ['i', 'Inbox'],
  ['u', 'Utilities'],
  ['?', 'Show this help'],
  ['Esc', 'Close this window'],
];

export default function ShortcutsOverlay({ onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (e.key === 'Enter' && q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); onClose(); }
        return;
      }
      if (e.key === 'Enter' && q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [q, navigate, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-[#202124] border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-bold text-xl mb-1">Keyboard Shortcuts</h2>
        <p className="text-gray-400 text-sm mb-4">Press a key anywhere on the site (unless you're typing).</p>
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); onClose(); } }}
          placeholder="Type a search and press Enter..."
          className="w-full px-4 py-2.5 bg-[#303134] border border-gray-700 rounded-lg text-white text-sm mb-4"
        />
        <div className="grid grid-cols-2 gap-2">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between bg-[#303134] rounded-lg px-3 py-2">
              <span className="text-gray-300 text-sm">{label}</span>
              <kbd className="px-2 py-0.5 bg-gray-700 text-white rounded text-xs font-mono">{key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Close</button>
      </div>
    </div>
  );
}
