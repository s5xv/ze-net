import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ['All', 'Building', 'Redstone', 'Design', 'Writing', 'Editing', 'Programming', 'Consulting', 'Management', 'Farming', 'Mining', 'Transport', 'Security', 'Other'];

export default function Marketplace() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => { fetchGigs(); }, [category, sort, minPrice, maxPrice]);

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (sort) params.set('sort', sort);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      const data = await apiFetch(`/api/app?action=search-gigs&${params}`);
      setGigs(data.gigs || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    apiFetch('/api/app?action=get-gig-categories').then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const filtered = gigs.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
  });

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketplace</h1>
            <p className="text-gray-400 text-sm">Find freelancers or offer your services</p>
          </div>
          {user && <Link to="/marketplace/post" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Post a Gig</Link>}
        </div>

        <div className="bg-[#303134] border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 mb-1 block">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="What service do you need?" className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sort</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Min $</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" className="w-20 px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Max $</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="999" className="w-20 px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg">No gigs found</p>
            <p className="text-gray-500 text-sm mt-1">Try different filters or be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(gig => (
              <Link key={gig.id} to={`/marketplace/${gig.id}`} className="block bg-[#303134] border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(gig.profiles?.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">{gig.title}</h3>
                    <p className="text-xs text-gray-400">{gig.profiles?.username || 'Unknown'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{gig.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">{gig.category}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-400">${parseFloat(gig.price).toFixed(2)}</span>
                    <span className="text-xs text-gray-500 ml-1">{gig.price_type === 'hourly' ? '/hr' : gig.price_type === 'negotiable' ? 'nego' : ''}</span>
                  </div>
                </div>
                {gig.delivery_days && (
                  <p className="text-xs text-gray-500 mt-2">⏱ {gig.delivery_days}d delivery</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
