import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Forums() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('forum_categories').select('*').order('sort_order').then(({ data }) => {
    setCategories(data || []);
    setLoading(false);
  }).catch(() => setLoading(false));
  }, []);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">Forums</h1>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div></div>)}</div>
        ) : (
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} onClick={() => navigate(`/forums/${cat.id}`)} className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h3 className="text-lg font-bold">{cat.title}</h3>
                    {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
