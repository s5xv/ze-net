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
      // First, get all page titles
      const response = await fetch(`${WIKI_API_URL}?action=query&list=allpages&aplimit=500&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' }
      });

      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch wiki pages' });

      const data = await response.json();
      const pages = data.query?.allpages || [];

      // Fetch content for each page in batches
      let successCount = 0;
      for (let i = 0; i < pages.length; i += 50) {
        const batch = pages.slice(i, i + 50);
        const titles = batch.map(p => p.title).join('|');
        
        const contentResponse = await fetch(
          `${WIKI_API_URL}?action=query&titles=${encodeURIComponent(titles)}&prop=extracts&explaintext=1&exintro=1&format=json`,
          { headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' } }
        );
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          const contentPages = contentData.query?.pages || {};
          
          for (const pageData of Object.values(contentPages)) {
            const title = pageData.title;
            const extract = pageData.extract || '';
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const url = `${WIKI_BASE_URL}/${encodeURIComponent(title.replace(/ /g, '_'))}`;
            
            // Check if page is empty or has placeholder text
            const isEmpty = !extract || 
                           extract.trim().length === 0 || 
                           extract.includes('There is currently no text in this page') ||
                           extract.includes('associated-pages');
            
            await supabase.from('wiki_pages').upsert({
              title: title,
              slug: slug,
              url: url,
              category: 'General',
              content: isEmpty ? null : extract,
              last_updated: new Date().toISOString()
            }, { onConflict: 'slug' });
            
            if (!isEmpty) successCount++;
          }
        }
      }

      return res.status(200).json({ 
        success: true, 
        count: pages.length,
        withContent: successCount,
        message: `Cached ${pages.length} pages (${successCount} with content)` 
      });

    } else if (action === 'single-page' && page) {
      // Fetch a single page with full content
      const response = await fetch(
        `${WIKI_API_URL}?action=query&titles=${encodeURIComponent(page)}&prop=extracts&explaintext=1&format=json`,
        { headers: { 'User-Agent': 'Z&ENet/1.0 (Wiki Scraper)' } }
      );

      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch page' });

      const data = await response.json();
      const pages = data.query?.pages || {};
      const pageData = Object.values(pages)[0];

      if (pageData && pageData.title) {
        const extract = pageData.extract || '';
        const slug = pageData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const url = `${WIKI_BASE_URL}/${encodeURIComponent(pageData.title.replace(/ /g, '_'))}`;
        
        const isEmpty = !extract || 
                       extract.trim().length === 0 || 
                       extract.includes('There is currently no text in this page');
        
        await supabase.from('wiki_pages').upsert({
          title: pageData.title,
          slug: slug,
          url: url,
          category: 'General',
          content: isEmpty ? null : extract,
          last_updated: new Date().toISOString()
        }, { onConflict: 'slug' });

        return res.status(200).json({ 
          success: true, 
          title: pageData.title,
          hasContent: !isEmpty,
          content: isEmpty ? null : extract.substring(0, 200) + '...'
        });
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
