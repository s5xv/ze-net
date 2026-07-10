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

      // Fetch content for each page individually using extracts
      for (const page of pages) {
        const title = page.title;
        
        try {
          const contentResponse = await fetch(
            `${WIKI_API_URL}?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json`,
            { headers: { 'User-Agent': 'Z&ENet/1.0' } }
          );
          
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const pagesData = contentData.query?.pages || {};
            const pageData = Object.values(pagesData)[0];
            
            let extract = pageData?.extract || '';
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const url = `${WIKI_BASE_URL}/${encodeURIComponent(title.replace(/ /g, '_'))}`;
            
            // Check if empty or placeholder
            const isEmpty = !extract || 
                           extract.trim().length === 0 || 
                           extract.includes('There is currently no text in this page') ||
                           extract.includes('associated-pages') ||
                           extract.length < 20;
            
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
              content: isEmpty ? null : extract,
              last_updated: new Date().toISOString()
            }, { onConflict: 'slug' });
          }
        } catch (e) {
          console.error(`Failed to fetch ${title}:`, e);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
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
