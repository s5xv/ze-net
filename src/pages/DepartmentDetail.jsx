import Footer from '../components/Footer';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { supabase } from './services/supabase';

export default function DepartmentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartment();
  }, [slug]);

  const fetchDepartment = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    
    setDepartment(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-neutral-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-neutral-500">Department not found</p>
          <button onClick={() => navigate('/departments')} className="mt-4 text-orange-500 hover:underline">Back to Departments</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <a href="/departments" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">DEPARTMENTS</a>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white dark:bg-[#111111] rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-white/5 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-grow">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{department.name}</h1>
              <p className="text-neutral-600 dark:text-neutral-400">{department.description || 'No description available'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {department.forum_url && (
              <a
                href={department.forum_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <span>Visit Forum</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={() => navigate('/departments')}
              className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg transition-colors"
            >
              Back to Departments
            </button>
          </div>
        </div>

        {/* Department Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-lg font-bold mb-4">Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Category ID:</span>
                <span className="font-mono">{department.forum_category_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Status:</span>
                <span className={department.is_active ? 'text-green-500' : 'text-red-500'}>
                  {department.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-neutral-200 dark:border-white/5">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href={`https://www.democracycraft.net/categories/${department.forum_category_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors"
              >
                View on DemocracyCraft
              </a>
              <a
                href="/contact"
                className="block px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors"
              >
                Contact Department
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
