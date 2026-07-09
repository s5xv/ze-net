import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function SearchAutocomplete({ value, onChange, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      const { data } = await supabase
        .from('sites')
        .select('name, category')
        .or(`name.ilike.%${value}%,category.ilike.%${value}%`)
        .limit(5);

      setSuggestions(data || []);
      setShowSuggestions(data && data.length > 0);
    };

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(suggestions[selectedIndex].name)}`);
        setShowSuggestions(false);
      } else {
        onSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    navigate(`/search?q=${encodeURIComponent(suggestion.name)}`);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e);
          setSelectedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Search sites..."
        className="w-full px-5 sm:px-6 py-4 sm:py-5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg sm:text-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm dark:shadow-none"
      />
      <button 
        type="submit" 
        className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 px-5 sm:px-8 bg-orange-500 hover:bg-orange-600 text-white text-base sm:text-lg font-medium rounded-lg transition-colors"
      >
        Search
      </button>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.name}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-orange-50 dark:bg-orange-500/10'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-neutral-900 dark:text-neutral-100">{suggestion.name}</span>
                <span className="text-xs text-neutral-500 font-mono">{suggestion.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
