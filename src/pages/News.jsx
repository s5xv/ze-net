import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS = {
  Announcement: 'bg-blue-500/20 text-blue-400',
  Election: 'bg-purple-500/20 text-purple-400',
  Politics: 'bg-fuchsia-500/20 text-fuchsia-400',
  Economy: 'bg-amber-500/20 text-amber-400',
  'Court & Law': 'bg-slate-500/20 text-slate-300',
  Community: 'bg-teal-500/20 text-teal-400',
  Event: 'bg-indigo-500/20 text-indigo-400',
  Guide: 'bg-cyan-500/20 text-cyan-400',
  Opinion: 'bg-pink-500/20 text-pink-400',
  Hiring: 'bg-rose-500/20 text-rose-400',
  Sale: 'bg-green-500/20 text-green-400',
  Update: 'bg-yellow-500/20 text-yellow-400',
  General: 'bg-gray-500/20 text-gray-400'
};

export default function News() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCompany, setMyCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ site_id: '', description: '' });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/app?action=list-news')
      .then(d => setNews(d.news || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (user) {
      apiFetch('/api/app?action=my-news-status')
        .then(d => setMyCompany(d.company || null))
        .catch(() => {});
      apiFetch('/api/app?action=my-companies')
        .then(d => { setCompanies(d.companies || []); if (d.companies?.length === 1) setRegForm(f => ({ ...f, site_id: d.companies[0].id })); })
        .catch(() => {});
    }
  }, [user]);

  const myStatus = myCompany?.status || (user ? 'none' : null);

  const categories = [...new Set(news.map(n => n.category).filter(Boolean))];

  const visibleNews = news.filter(n =>
    (filter === 'all' || n.category === filter) &&
    (!search || (n.title || '').toLowerCase().includes(search.toLowerCase()) || (n.content || '').toLowerCase().includes(search.toLowerCase()))
  );

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (!regForm.site_id) { setRegError('Please select a company'); return; }
    setRegSubmitting(true);
    setRegError('');
    try {
      const data = await apiFetch('/api/app?action=register-news-company', { method: 'POST', body: JSON.stringify(regForm) });
      if (data.company) { setMyCompany(data.company); setShowRegister(false); }
      else setRegError('Registration failed');
    } catch (err) { setRegError(err.message); }
    setRegSubmitting(false);
  };

  const registerPanel = (
    <div className="bg-[#303134] border border-gray-700 rounded-xl p-6 mb-6">
      <h2 className="text-lg font-bold text-white mb-2">🎙️ Become a News Company</h2>
      {companies.length === 0 ? (
        <p className="text-sm text-gray-400">You need to own an approved registered company before you can become a news company. <Link to="/submit-site" className="text-blue-400 hover:underline">Register a company</Link> first.</p>
      ) : !showRegister ? (
        <>
          <p className="text-sm text-gray-400 mb-4">Register to publish news updates. Your application will be reviewed by staff before you can post.</p>
          <button onClick={() => setShowRegister(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Register</button>
        </>
      ) : (
        <form onSubmit={submitRegistration} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Company *</label>
            <select value={regForm.site_id} onChange={e => setRegForm({...regForm, site_id: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white">
              <option value="">Select a company you own...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">About your news company</label>
            <textarea value={regForm.description} onChange={e => setRegForm({...regForm, description: e.target.value})} rows={3} placeholder="What kind of news do you cover?" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>
          {regError && <p className="text-red-400 text-sm">{regError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={regSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">{regSubmitting ? 'Submitting...' : 'Submit Application'}</button>
            <button type="button" onClick={() => setShowRegister(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <Layout user={user}>
      <main className="w-full max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">News</h1>
            <p className="text-sm text-gray-500 mt-1">Updates from news companies across DemocracyCraft</p>
          </div>
          {user && myStatus === 'approved' && (
            <Link to="/news/post" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Post News</Link>
          )}
        </div>

        {user && myStatus === 'none' && registerPanel}

        {user && myStatus === 'pending' && (
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 text-sm font-medium">⏳ Your news-company application ({myCompany?.company_name}) is pending review.</p>
          </div>
        )}

        {user && myStatus === 'rejected' && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm font-medium mb-3">🚫 Your news-company application was rejected. You can submit a new application below.</p>
            {!showRegister ? (
              <button onClick={() => setShowRegister(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">Apply Again</button>
            ) : (
              <form onSubmit={submitRegistration} className="space-y-3 max-w-md">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company *</label>
                  <select value={regForm.site_id} onChange={e => setRegForm({...regForm, site_id: e.target.value})} className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white">
                    <option value="">Select a company you own...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">About your news company</label>
                  <textarea value={regForm.description} onChange={e => setRegForm({...regForm, description: e.target.value})} rows={3} placeholder="What kind of news do you cover?" className="w-full px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
                </div>
                {regError && <p className="text-red-400 text-sm">{regError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={regSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">{regSubmitting ? 'Submitting...' : 'Submit Application'}</button>
                  <button type="button" onClick={() => setShowRegister(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {(categories.length > 0 || news.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter === 'all' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#303134] border-gray-700 text-gray-400 hover:text-white'}`}>All</button>
            {categories.map(c => (
              <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter === c ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#303134] border-gray-700 text-gray-400 hover:text-white'}`}>{c}</button>
            ))}
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news..." className="ml-auto w-48 px-3 py-1.5 bg-[#202124] border border-gray-700 rounded-lg text-white text-xs placeholder-gray-500" />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : visibleNews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{news.length === 0 ? 'No news yet.' : 'No news match your filters.'}</div>
        ) : (
          <div className="space-y-4">
            {visibleNews.map(item => (
              <article key={item.id} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General}`}>{item.category}</span>
                  <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                {item.image_url && <img src={item.image_url} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />}
                <p className="text-xs text-gray-400 mt-3">by {item.profiles?.username || 'Unknown'}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}