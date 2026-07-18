import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Compare() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const ids = params.get('ids')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    supabase.from('sites').select('slug, name, category').eq('status', 'approved').order('view_count', { ascending: false }).limit(50)
      .then(({ data }) => setAllSites(data || []));
  }, []);

  useEffect(() => {
    if (ids.length < 2) { setSites([]); setLoading(false); return; }
    setLoading(true);
    supabase.from('sites').select('*').in('slug', ids)
      .then(({ data }) => setSites(data || []))
      .finally(() => setLoading(false));
  }, [params]);

  const addSite = (slug) => {
    if (!slug || ids.includes(slug)) return;
    setParams({ ids: [...ids, slug].join(',') });
    setSearch('');
  };

  const removeSite = (slug) => {
    const next = ids.filter(s => s !== slug);
    if (next.length === 0) setSites([]);
    setParams({ ids: next.join(',') });
  };

  const filtered = allSites.filter(s =>
    !ids.includes(s.slug) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase()))
  );

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Compare Sites</h1>
        <p className="text-gray-400 mb-6">Add sites to compare side-by-side.</p>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {ids.map(slug => {
              const s = allSites.find(x => x.slug === slug) || { slug, name: slug };
              return (
                <span key={slug} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
                  {s.name}
                  <button onClick={() => removeSite(slug)} className="ml-1 hover:text-red-300">&times;</button>
                </span>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search sites to add..."
              className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
            {search && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#303134] border border-gray-700 rounded-lg max-h-48 overflow-y-auto z-10">
                {filtered.slice(0, 10).map(s => (
                  <button key={s.slug} onClick={() => addSite(s.slug)}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 text-sm flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-gray-400 text-xs">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : sites.length < 2 ? (
          <div className="bg-[#303134] border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-2">Add at least 2 sites to compare</p>
            <p className="text-gray-500 text-sm">Search and select sites above</p>
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
