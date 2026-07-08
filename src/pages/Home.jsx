import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleFeelingLucky = () => {
    // Clear the input and focus it so the user can start fresh
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    // Use min-h-screen and flex to push the footer to the bottom naturally
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* Main Content Area: Takes up all available space and centers its children */}
      <main className="flex-grow flex flex-col items-center justify-center px-4">
        <h1 className="text-6xl font-bold text-gray-800 mb-8 tracking-tight">
          Z&E <span className="text-blue-600">Net</span>
        </h1>
        
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div className="flex items-center w-full px-5 py-3 rounded-full border border-gray-200 shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow bg-white">
            <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the DemocracyCraft network..."
              className="flex-grow outline-none text-lg text-gray-700 bg-transparent"
              autoFocus
            />
          </div>
          
          <div className="flex justify-center mt-8 space-x-3">
            <button type="submit" className="px-6 py-2 bg-gray-50 text-gray-700 text-sm rounded border border-gray-100 hover:shadow-sm">
              Z&E Search
            </button>
            <button type="button" onClick={handleFeelingLucky} className="px-6 py-2 bg-gray-50 text-gray-700 text-sm rounded border border-gray-100 hover:shadow-sm">
              I'm Feeling Lucky
            </button>
          </div>
        </form>
      </main>

      {/* Footer: Naturally sits at the bottom because of flex-grow on the main tag */}
      <footer className="w-full text-center text-sm text-gray-500 py-4 bg-gray-100 border-t border-gray-200">
        DemocracyCraft Centralized Directory &copy; 2026
      </footer>
    </div>
  );
}
