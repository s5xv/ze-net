import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const WIKI_BASE_URL = 'https://wiki.democracycraft.net';
const WIKI_API_URL = `${WIKI_BASE_URL}/api.php`;

export default async function handler(req, res) {
  const { action, page } = req.query;

  try {
    if (action === 'all-pages') {
      const response = await fetch(`${WIKI_API_URL}?action=query&list=allpages&aplimit=500&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' }
      });

      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch wiki pages' });

      const data = await response.json();
      const pages = data.query?.allpages || [];

      for (const p of pages) {
        // FIXED: Remove /wiki/ prefix - use just /PageTitle
        const url = `${WIKI_BASE_URL}/${encodeURIComponent(p.title.replace(/ /g, '_'))}`;
        const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        await supabase.from('wiki_pages').upsert({
          title: p.title,
          slug: slug,
          url: url,
          category: 'General',
          content: '',
          last_updated: new Date().toISOString()
        }, { onConflict: 'slug' });
      }

      return res.status(200).json({ success: true, count: pages.length, message: `Cached ${pages.length} wiki pages` });

    } else if (action === 'categories') {
      const response = await fetch(`${WIKI_API_URL}?action=query&list=categories&cllimit=500&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' }
      });

      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch categories' });

      const data = await response.json();
      const categories = data.query?.categories || [];

      for (const cat of categories) {
        const catName = cat.title.replace('Category:', '');
        const slug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const url = `${WIKI_BASE_URL}/Category:${encodeURIComponent(catName.replace(/ /g, '_'))}`;
        
        await supabase.from('wiki_pages').upsert({
          title: catName,
          slug: `category-${slug}`,
          url: url,
          category: 'Category',
          content: '',
          last_updated: new Date().toISOString()
        }, { onConflict: 'slug' });
      }

      return res.status(200).json({ success: true, count: categories.length, message: `Cached ${categories.length} categories` });

    } else if (action === 'page-content' && page) {
      const response = await fetch(`${WIKI_API_URL}?action=query&titles=${encodeURIComponent(page)}&prop=extracts&explaintext=1&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' }
      });

      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch page content' });

      const data = await response.json();
      const pages = data.query?.pages || {};
      const pageData = Object.values(pages)[0];

      if (pageData && pageData.extract) {
        const slug = page.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        await supabase.from('wiki_pages').update({
          content: pageData.extract,
          last_updated: new Date().toISOString()
        }).eq('slug', slug);

        return res.status(200).json({ success: true, content: pageData.extract });
      }

      return res.status(404).json({ error: 'Page not found' });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Wiki scrape error:', error);
    return res.status(500).json({ error: error.message });
  }
}
