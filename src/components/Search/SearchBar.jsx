import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ defaultValue = '', size = 'md', className = '' }) {
  const [query, setQuery] = useState(defaultValue);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative flex items-center bg-gray-900 border border-gray-800 rounded-2xl shadow-xl shadow-blue-900/5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <svg 
          className="w-6 h-6 text-gray-500 ml-5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses, services, or players..."
          className={`flex-grow bg-transparent outline-none text-gray-100 placeholder-gray-500 ${sizes[size]}`}
          autoFocus
        />
      </div>
    </form>
  );
}
