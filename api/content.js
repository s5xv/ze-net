import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const WIKI_BASE = 'https://wiki.democracycraft.net';

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.split(' ')[1]);
  if (error || !user) return null;
  return user;
};

const WIKI_BATCH_SIZE = 20;

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function scrapeWikiBatch(cursor, requestedLimit) {
  const limit = Math.min(WIKI_BATCH_SIZE, Math.max(1, requestedLimit || WIKI_BATCH_SIZE));
  const params = new URLSearchParams({
    action: 'query',
    generator: 'allpages',
    gapnamespace: '0',
    gaplimit: String(limit),
    prop: 'extracts|info',
    inprop: 'url',
    exintro: '1',
    explaintext: '1',
    exchars: '1200',
    exlimit: String(limit),
    format: 'json'
  });
  if (cursor) params.set('gapcontinue', cursor);

  const response = await fetch(`${WIKI_BASE}/api.php?${params.toString()}`, {
    headers: {
      'User-Agent': 'Z&ENet/1.0 (Wiki sync; +https://ze-net.vercel.app)',
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Wiki API request failed (${response.status})`);

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {}).filter((page) => page.title && !page.missing);
  const rows = pages.map((page) => ({
    title: page.title,
    slug: toSlug(page.title),
    url: page.fullurl || `${WIKI_BASE}/index.php?title=${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    content: (page.extract || '').trim(),
    category: page.title.includes(':') ? page.title.split(':')[0] : 'General',
    source: 'wiki'
  }));

  if (rows.length > 0) {
    const seen = new Set();
    const unique = rows.filter(r => { const k = r.slug; return seen.has(k) ? false : seen.add(k); });
    const { error } = await supabase.from('wiki_pages').upsert(unique, { onConflict: 'slug' });
    if (error) throw new Error(`Wiki storage failed: ${error.message}`);
  }

  return {
    scraped: rows.length,
    nextCursor: data.continue?.gapcontinue || null
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, forumId } = req.query;

  if (action === 'ingest') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { title, url, content, category } = req.body;
    if (!url || !content) return res.status(400).json({ error: 'url and content required' });
    const slug = (title || url.split('/').pop() || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error } = await supabase.from('wiki_pages').upsert({
      title: title || url.split('/').pop() || 'Page',
      url, content: content.substring(0, 10000),
      category: category || 'Site', slug
    }, { onConflict: 'slug', ignoreDuplicates: true });
    if (error && !error.message.includes('duplicate key')) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (action === 'wiki') {
    const user = await getUser(req);
    const { data: profile } = await supabase.from('profiles').select('is_staff').eq('id', user?.id).maybeSingle();
    if (!profile?.is_staff) return res.status(403).json({ error: 'Admin access required' });
    try {
      const rawLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(rawLimit) ? rawLimit : WIKI_BATCH_SIZE;
      const result = await scrapeWikiBatch(req.query.cursor, limit);
      return res.status(200).json({
        success: true,
        message: `Synced ${result.scraped} wiki pages`,
        results: { wiki: result.scraped },
        nextCursor: result.nextCursor,
        done: !result.nextCursor
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'threads' && forumId) {
    try {
      const { data } = await supabase.from('forum_cache').select('*').eq('type', 'thread').eq('parent_id', forumId).order('last_updated', { ascending: false });
      return res.status(200).json({ threads: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'categories') {
    try {
      const { data } = await supabase.from('forum_cache').select('*').eq('type', 'category').order('title');
      return res.status(200).json({ categories: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
