import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Header({ user }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-zinc-100 tracking-tight text-lg">Z&E NET</Link>
        <nav className="hidden md:flex gap-4 text-sm text-zinc-400">
          <Link to="/search" className="hover:text-zinc-100">Directory</Link>
          <Link to="/utilities" className="hover:text-zinc-100">Utilities</Link>
          <Link to="/link-account" className="hover:text-zinc-100">Link MC</Link>
        </nav>
      </div>
      
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search directory..."
          className="w-full bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </form>
      
      <div className="text-sm text-zinc-400">
        {user ? (
          <Link to="/account" className="hover:text-zinc-100">Account</Link>
        ) : (
          <Link to="/login" className="hover:text-zinc-100">Login</Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 px-4 py-4 text-xs text-zinc-500 mt-auto">
      <div className="max-w-5xl mx-auto flex justify-between">
        <span>Z&E Net - DemocracyCraft Centralized Directory</span>
        <span className="font-mono">System Status: Operational</span>
      </div>
    </footer>
  );
}
