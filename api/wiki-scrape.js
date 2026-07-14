import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const WIKI_BASE = 'https://wiki.democracycraft.net';
const SITE_BASE = 'https://www.democracycraft.net';

// Helper to fetch and parse HTML (using basic regex since we can't use cheerio in Vercel)
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZenetBot/1.0)'
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    return null;
  }
}

// Extract title from HTML
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

// Extract content from HTML (basic text extraction)
function extractContent(html) {
  // Remove scripts and styles
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim().substring(0, 5000); // Limit to 5000 chars
}

// Extract category from URL or content
function extractCategory(url, html) {
  if (url.includes('/forum') || url.includes('/thread')) return 'Forum';
  if (url.includes('/application')) return 'Application';
  if (url.includes('/archive')) return 'Archive';
  
  // Try to find category in breadcrumbs or metadata
  const categoryMatch = html.match(/category[:\s]+([^\n<]+)/i);
  if (categoryMatch) return categoryMatch[1].trim();
  
  return 'General';
}

// Scrape wiki pages
async function scrapeWikiPages() {
  console.log('Scraping wiki pages...');
  
  // Try to get sitemap or index
  const sitemapUrl = `${WIKI_BASE}/sitemap.xml`;
  const sitemapHtml = await fetchPage(sitemapUrl);
  
  let urls = [];
  
  if (sitemapHtml) {
    // Extract URLs from sitemap
    const urlMatches = sitemapHtml.match(/<loc>([^<]+)<\/loc>/g);
    if (urlMatches) {
      urls = urlMatches.map(m => m.replace(/<\/?loc>/g, ''));
    }
  }
  
  // If no sitemap, try common wiki pages
  if (urls.length === 0) {
    urls = [
      `${WIKI_BASE}/`,
      `${WIKI_BASE}/Main_Page`,
      `${WIKI_BASE}/Special:AllPages`
    ];
  }
  
  let scraped = 0;
  for (const url of urls.slice(0, 100)) { // Limit to 100 for now
    const html = await fetchPage(url);
    if (!html) continue;
    
    const title = extractTitle(html) || url.split('/').pop() || 'Untitled';
    const content = extractContent(html);
    const category = extractCategory(url, html);
    
    // Upsert to database
    await supabase.from('wiki_pages').upsert({
      title,
      url,
      content,
      category,
      source: 'wiki',
      last_synced: new Date().toISOString()
    }, { onConflict: 'url' });
    
    scraped++;
    console.log(`Scraped: ${title}`);
  }
  
  return scraped;
}

// Scrape forum threads
async function scrapeForumThreads() {
  console.log('Scraping forum threads...');
  
  // Try common forum URLs
  const forumUrls = [
    `${SITE_BASE}/forum`,
    `${SITE_BASE}/forums`,
    `${SITE_BASE}/threads`,
    `${SITE_BASE}/discussions`
  ];
  
  let scraped = 0;
  
  for (const forumUrl of forumUrls) {
    const html = await fetchPage(forumUrl);
    if (!html) continue;
    
    // Extract thread links
    const threadMatches = html.match(/href="([^"]*(?:thread|topic|discussion)[^"]*)"/gi);
    if (!threadMatches) continue;
    
    const threadUrls = [...new Set(threadMatches.map(m => {
      const match = m.match(/href="([^"]+)"/);
      return match ? (match[1].startsWith('http') ? match[1] : `${SITE_BASE}${match[1]}`) : null;
    }).filter(Boolean))];
    
    for (const url of threadUrls.slice(0, 50)) { // Limit to 50 threads per forum
      const threadHtml = await fetchPage(url);
      if (!threadHtml) continue;
      
      const title = extractTitle(threadHtml);
      const content = extractContent(threadHtml);
      
      await supabase.from('wiki_pages').upsert({
        title,
        url,
        content,
        category: 'Forum',
        source: 'forum',
        last_synced: new Date().toISOString()
      }, { onConflict: 'url' });
      
      scraped++;
      console.log(`Scraped thread: ${title}`);
    }
  }
  
  return scraped;
}

// Scrape applications
async function scrapeApplications() {
  console.log('Scraping applications...');
  
  const appUrls = [
    `${SITE_BASE}/applications`,
    `${SITE_BASE}/apply`,
    `${SITE_BASE}/staff-applications`,
    `${SITE_BASE}/jobs`
  ];
  
  let scraped = 0;
  
  for (const appUrl of appUrls) {
    const html = await fetchPage(appUrl);
    if (!html) continue;
    
    // Extract application links
    const appMatches = html.match(/href="([^"]*(?:application|apply|job)[^"]*)"/gi);
    if (!appMatches) continue;
    
    const urls = [...new Set(appMatches.map(m => {
      const match = m.match(/href="([^"]+)"/);
      return match ? (match[1].startsWith('http') ? match[1] : `${SITE_BASE}${match[1]}`) : null;
    }).filter(Boolean))];
    
    for (const url of urls.slice(0, 30)) {
      const pageHtml = await fetchPage(url);
      if (!pageHtml) continue;
      
      const title = extractTitle(pageHtml);
      const content = extractContent(pageHtml);
      
      await supabase.from('wiki_pages').upsert({
        title,
        url,
        content,
        category: 'Application',
        source: 'application',
        last_synced: new Date().toISOString()
      }, { onConflict: 'url' });
      
      scraped++;
      console.log(`Scraped application: ${title}`);
    }
  }
  
  return scraped;
}

// Scrape archives
async function scrapeArchives() {
  console.log('Scraping archives...');
  
  const archiveUrls = [
    `${SITE_BASE}/archive`,
    `${SITE_BASE}/archives`,
    `${WIKI_BASE}/archive`,
    `${WIKI_BASE}/archives`
  ];
  
  let scraped = 0;
  
  for (const archiveUrl of archiveUrls) {
    const html = await fetchPage(archiveUrl);
    if (!html) continue;
    
    // Extract archive links
    const archiveMatches = html.match(/href="([^"]*(?:archive|old|history)[^"]*)"/gi);
    if (!archiveMatches) continue;
    
    const urls = [...new Set(archiveMatches.map(m => {
      const match = m.match(/href="([^"]+)"/);
      return match ? (match[1].startsWith('http') ? match[1] : `${SITE_BASE}${match[1]}`) : null;
    }).filter(Boolean))];
    
    for (const url of urls.slice(0, 30)) {
      const pageHtml = await fetchPage(url);
      if (!pageHtml) continue;
      
      const title = extractTitle(pageHtml);
      const content = extractContent(pageHtml);
      
      await supabase.from('wiki_pages').upsert({
        title,
        url,
        content,
        category: 'Archive',
        source: 'archive',
        last_synced: new Date().toISOString()
      }, { onConflict: 'url' });
      
      scraped++;
      console.log(`Scraped archive: ${title}`);
    }
  }
  
  return scraped;
}

export default async function handler(req, res) {
  const { action } = req.query;
  
  try {
    let results = {};
    
    if (action === 'all' || action === 'all-pages') {
      results.wiki = await scrapeWikiPages();
      results.forums = await scrapeForumThreads();
      results.applications = await scrapeApplications();
      results.archives = await scrapeArchives();
    } else if (action === 'wiki') {
      results.wiki = await scrapeWikiPages();
    } else if (action === 'forums') {
      results.forums = await scrapeForumThreads();
    } else if (action === 'applications') {
      results.applications = await scrapeApplications();
    } else if (action === 'archives') {
      results.archives = await scrapeArchives();
    }
    
    const total = Object.values(results).reduce((sum, val) => sum + (val || 0), 0);
    
    res.status(200).json({
      success: true,
      message: `Synced ${total} pages`,
      results
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
}
