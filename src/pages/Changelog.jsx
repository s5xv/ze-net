import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function Changelog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('changelog')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data);
        setLoading(false);
      });
  }, []);

  const grouped = {};
  for (const e of entries) {
    if (!grouped[e.date_label]) grouped[e.date_label] = [];
    grouped[e.date_label].push(e);
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">What has changed on Z&E Net</p>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No changelog entries yet</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{date}</h2>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.content}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
