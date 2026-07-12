import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const WIKI_BASE = 'https://wiki.democracycraft.net';

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZenetBot/1.0; +https://ze-net.vercel.app)', 'Accept': 'application/json, text/html' }
    });
    if (!res.ok) return null;
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch { return null; }
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZenetBot/1.0; +https://ze-net.vercel.app)', 'Accept': 'text/html' }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

function extractContent(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim().substring(0, 10000);
}

async function scrapeWikiViaApi() {
  const data = await fetchJson(`${WIKI_BASE}/api.php?action=query&list=allpages&aplimit=max&format=json`);
  if (!data?.query?.allpages) return 0;
  let scraped = 0;
  for (const page of data.query.allpages) {
    const title = page.title;
    const url = `${WIKI_BASE}/index.php/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const content = extractContent(html);
    if (content.length > 20) {
      let category = 'General';
      if (title.includes(':')) category = title.split(':')[0];
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await supabase.from('wiki_pages').insert({ title, url, content: content.substring(0, 10000), category, slug }).catch(() => {});
      scraped++;
    }
  }
  return scraped;
}

export default async function handler(req, res) {
  const { action, type, forumId } = req.query;

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
    try {
      const result = await scrapeWikiViaApi();
      return res.status(200).json({ success: true, message: `Synced ${result} pages`, results: { wiki: result } });
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
