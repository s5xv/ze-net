import { useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

function extractSearchTerms(q) {
  const questionWords = ['who is ', 'what is ', 'what are ', 'where is ', 'how to ', 'how do i ', 'tell me about ', 'find ', 'search for ', 'i need ', 'looking for ', 'show me '];
  let term = q;
  for (const prefix of questionWords) {
    if (term.startsWith(prefix)) { term = term.slice(prefix.length); break; }
  }
  return term.trim() || q;
}

const renderMarkdownBold = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export default function Ask() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const askId = useRef(0);

  const searchDatabase = async (rawQuery) => {
    const searchTerm = extractSearchTerms(rawQuery.toLowerCase().trim());
    const results = [];
    try {
      const siteData = await apiFetch('/api/app?action=search-sites', { method: 'POST', body: JSON.stringify({ q: searchTerm }) });
      results.push(...(siteData.sites || []));
    } catch (_) {}
    try {
      const { data: wikiData } = await supabase.from('wiki_pages').select('*').or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`).limit(20);
      if (wikiData) results.push(...wikiData.filter(p => p.content && p.content.trim()));
    } catch (_) {}
    try {
      const deptData = await apiFetch('/api/app?action=get-departments');
      const allDepts = deptData.departments || [];
      if (allDepts.length > 0) {
        const isDeptQuery = ['department', 'dept', 'government', 'ministry', 'agency', 'office'].some(w => searchTerm.includes(w));
        const filtered = isDeptQuery ? allDepts : allDepts.filter(d =>
          d.name.toLowerCase().includes(searchTerm) ||
          (d.description || '').toLowerCase().includes(searchTerm)
        );
        results.push(...filtered);
      }
    } catch (_) {}
    return results;
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    const id = ++askId.current;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    try {
      const results = await searchDatabase(q);
      const data = await apiFetch('/api/app?action=summarize', {
        method: 'POST',
        body: JSON.stringify({ query: q, results })
      });
      if (id === askId.current) {
        setAnswer(data.summary || 'No answer generated.');
        setSources(data.sources || []);
        setHistory(prev => [{ q: q.trim(), a: data.summary, sources: data.sources || [] }, ...prev].slice(0, 20));
      }
    } catch (err) {
      if (id === askId.current) setAnswer('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ask about DemocracyCraft</h1>
          <p className="text-gray-500 dark:text-gray-400">Any question about the server, economy, government, or sites — get an AI answer.</p>
        </div>

        <form onSubmit={handleAsk} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. What banks are in Redmont?"
              className="flex-grow px-5 py-3 bg-white dark:bg-[#303134] border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <button type="submit" disabled={loading || !q.trim()} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-full font-medium shadow-sm transition-colors">
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        )}

        {answer && !loading && (
          <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-b border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">Answer</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] whitespace-pre-wrap">{renderMarkdownBold(answer)}</p>
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-500 font-medium">Sources:</span>
                  {sources.slice(0, 6).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-[#171717] border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Powered by Mistral AI</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">Based on Z&E Net data</span>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Questions</h3>
            {history.map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">{item.q}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{renderMarkdownBold(item.a)}</p>
                {item.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.sources.slice(0, 3).map((s, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!answer && !loading && history.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">Ask anything about DemocracyCraft</p>
            <p className="text-sm mt-2">Banks, shops, government, properties, or general server questions</p>
          </div>
        )}
      </main>
    </Layout>
  );
}
