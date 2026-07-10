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
      // Get all page titles
      const titlesResponse = await fetch(`${WIKI_API_URL}?action=query&list=allpages&aplimit=500&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0' }
      });

      if (!titlesResponse.ok) return res.status(500).json({ error: 'Failed to fetch page list' });

      const titlesData = await titlesResponse.json();
      const pages = titlesData.query?.allpages || [];

      let successCount = 0;
      let emptyCount = 0;

      // Fetch content for each page
      for (let i = 0; i < pages.length; i += 20) {
        const batch = pages.slice(i, i + 20);
        const titles = batch.map(p => p.title).join('|');
        
        const contentResponse = await fetch(
          `${WIKI_API_URL}?action=parse&page=${encodeURIComponent(titles)}&prop=wikitext&format=json`,
          { headers: { 'User-Agent': 'Z&ENet/1.0' } }
        );
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          
          for (const pageData of batch) {
            const title = pageData.title;
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const url = `${WIKI_BASE_URL}/${encodeURIComponent(title.replace(/ /g, '_'))}`;
            
            // Try to get content from parse result
            let content = '';
            if (contentData.parse?.wikitext?.['*']) {
              content = contentData.parse.wikitext['*'];
            }
            
            const isEmpty = !content || content.trim().length === 0;
            
            if (isEmpty) {
              emptyCount++;
            } else {
              successCount++;
            }
            
            await supabase.from('wiki_pages').upsert({
              title: title,
              slug: slug,
              url: url,
              category: 'General',
              content: isEmpty ? null : content,
              last_updated: new Date().toISOString()
            }, { onConflict: 'slug' });
          }
        }
      }

      return res.status(200).json({ 
        success: true, 
        total: pages.length,
        withContent: successCount,
        empty: emptyCount,
        message: `Processed ${pages.length} pages (${successCount} with content, ${emptyCount} empty)` 
      });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Wiki error:', error);
    return res.status(500).json({ error: error.message });
  }
}
