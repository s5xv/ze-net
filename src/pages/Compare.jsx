import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Compare() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = params.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length < 2) { setLoading(false); return; }
    supabase.from('sites').select('*').in('slug', ids)
      .then(({ data }) => setSites(data || []))
      .finally(() => setLoading(false));
  }, [params]);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Compare Sites</h1>
        <p className="text-gray-400 mb-8">Add `?ids=site1,site2` to the URL to compare two or more sites.</p>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : sites.length < 2 ? (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Select at least 2 sites to compare</p>
            <p className="text-gray-500 text-sm">Example: /compare?ids=my-shop,another-shop</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-3 text-gray-400 font-medium text-sm w-40">Field</th>
                  {sites.map(s => (
                    <th key={s.id} className="p-3 text-white font-bold">
                      <Link to={`/site/${s.slug}`} className="hover:text-blue-400">{s.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Image', field: 'image_url', render: (v) => v ? <img src={v} alt="" className="w-12 h-12 rounded object-cover" /> : '-' },
                  { label: 'Category', field: 'category' },
                  { label: 'Subcategory', field: 'subcategory' },
                  { label: 'Views', field: 'view_count' },
                  { label: 'Description', field: 'description', render: (v) => v ? v.slice(0, 100) + '...' : '-' },
                  { label: 'Verified', field: 'is_verified', render: (v) => v ? '✅' : '❌' },
                  { label: 'Status', field: 'customization', render: (v) => v?.status ? v.status.toUpperCase() : '-' },
                  { label: 'Tags', field: 'customization', render: (v) => v?.tags?.join(', ') || '-' },
                ].map(({ label, field, render }) => (
                  <tr key={label} className="border-b border-gray-700/50">
                    <td className="p-3 text-gray-400 text-sm font-medium">{label}</td>
                    {sites.map(s => {
                      let val = field.split('.').reduce((o, k) => o?.[k], s);
                      if (val === null || val === undefined) val = '-';
                      return <td key={s.id} className="p-3 text-white text-sm">{render ? render(s[field]) : String(val)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Layout>
  );
}
