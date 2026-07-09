import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const FORUM_BASE_URL = 'https://www.democracycraft.net';

// Simple HTML parser helper
function extractText(html, startTag, endTag) {
  const start = html.indexOf(startTag);
  if (start === -1) return '';
  const end = html.indexOf(endTag, start);
  if (end === -1) return '';
  return html.substring(start + startTag.length, end).trim();
}

function extractAll(html, pattern) {
  const regex = new RegExp(pattern, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

export default async function handler(req, res) {
  const { action, forumId, threadId } = req.query;

  try {
    if (action === 'categories') {
      // Fetch main forum page and extract categories
      const response = await fetch(`${FORUM_BASE_URL}/forums/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch forum' });
      }

      const html = await response.text();
      
      // Parse categories from XenForo HTML
      const categories = [];
      const categoryRegex = /data-category-id="(\d+)"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="node-description">([^<]*)<\/div>/gi;
      
      let match;
      while ((match = categoryRegex.exec(html)) !== null) {
        categories.push({
          id: match[1],
          url: match[2].startsWith('http') ? match[2] : FORUM_BASE_URL + match[2],
          title: match[3].trim(),
          description: match[4].trim()
        });
      }

      // If regex didn't work, try alternative parsing
      if (categories.length === 0) {
        const altRegex = /<a[^>]*href="([^"]*categories[^"]*)"[^>]*>([^<]+)<\/a>/gi;
        while ((match = altRegex.exec(html)) !== null) {
          const url = match[1].startsWith('http') ? match[1] : FORUM_BASE_URL + match[1];
          const title = match[2].trim();
          if (title && !title.includes('RSS')) {
            categories.push({
              id: url.split('.').pop().replace('/', ''),
              url,
              title,
              description: ''
            });
          }
        }
      }

      // Cache the results
      for (const cat of categories) {
        await supabase.from('forum_cache').upsert({
          type: 'category',
          forum_id: cat.id,
          title: cat.title,
          content: cat.description,
          url: cat.url,
          metadata: cat,
          last_updated: new Date().toISOString()
        }, { onConflict: 'forum_id,type' });
      }

      return res.status(200).json({ categories });

    } else if (action === 'threads' && forumId) {
      // Fetch threads for a specific category
      const response = await fetch(`${FORUM_BASE_URL}/categories/${forumId}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch threads' });
      }

      const html = await response.text();
      const threads = [];
      
      // Parse threads
      const threadRegex = /<a[^>]*href="([^"]*threads[^"]*)"[^>]*class="[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="username"[^>]*>([^<]+)<\/a>/gi;
      
      let match;
      while ((match = threadRegex.exec(html)) !== null) {
        const url = match[1].startsWith('http') ? match[1] : FORUM_BASE_URL + match[1];
        threads.push({
          id: url.split('.').pop().replace('/', ''),
          url,
          title: match[2].trim(),
          author: match[3].trim()
        });
      }

      // Cache threads
      for (const thread of threads) {
        await supabase.from('forum_cache').upsert({
          type: 'thread',
          forum_id: thread.id,
          parent_id: forumId,
          title: thread.title,
          content: '',
          author: thread.author,
          url: thread.url,
          metadata: thread,
          last_updated: new Date().toISOString()
        }, { onConflict: 'forum_id,type' });
      }

      return res.status(200).json({ threads });

    } else if (action === 'posts' && threadId) {
      // Fetch posts for a specific thread
      const response = await fetch(`${FORUM_BASE_URL}/threads/${threadId}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch posts' });
      }

      const html = await response.text();
      const posts = [];
      
      // Parse posts
      const postRegex = /<article[^>]*data-post-id="(\d+)"[^>]*>[\s\S]*?<a[^>]*class="username"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="message-body">[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/article>/gi;
      
      let match;
      while ((match = postRegex.exec(html)) !== null) {
        posts.push({
          id: match[1],
          author: match[2].trim(),
          content: match[3].trim().replace(/<[^>]*>/g, '').trim()
        });
      }

      // Cache posts
      for (const post of posts) {
        await supabase.from('forum_cache').upsert({
          type: 'post',
          forum_id: post.id,
          parent_id: threadId,
          title: '',
          content: post.content,
          author: post.author,
          url: '',
          metadata: post,
          last_updated: new Date().toISOString()
        }, { onConflict: 'forum_id,type' });
      }

      return res.status(200).json({ posts });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Forum scrape error:', error);
    return res.status(500).json({ error: error.message });
  }
}
