import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';

export default function Departments() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    
    setDepartments(data || []);
    setLoading(false);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Government Departments</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-6">Browse and access all government departments</p>
          
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search departments..."
              className="w-full px-6 py-4 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 animate-pulse">
                <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111111] rounded-xl border border-neutral-200 dark:border-white/5">
            <p className="text-neutral-500">No departments found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => navigate(`/departments/${dept.slug}`)}
                className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5 hover:border-orange-500/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">{dept.name}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{dept.description || 'No description available'}</p>
                    <div className="flex items-center text-xs text-orange-500 font-medium">
                      <span>View Department</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.democracycraft.net/forums" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Main Forums
            </a>
            <a href="https://wiki.democracycraft.net/Main_Page" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              Wiki
            </a>
            <a href="https://www.democracycraft.net/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors">
              DemocracyCraft.net
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
