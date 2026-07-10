import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API = 'https://api.democracycraft.net/economy/api/v1';
const WIKI_API = 'https://wiki.democracycraft.net/api.php';
const BLUEMAP_URL = 'https://map.democracycraft.net/maps/reveille/live/players.json';

export default async function handler(req, res) {
  const { path, action } = req.query;
  const endpoint = Array.isArray(path) ? path.join('/') : path;

  try {
    // ============ ONLINE PLAYERS ============
    if (endpoint === 'online-players') {
      const response = await fetch(BLUEMAP_URL, { headers: { 'User-Agent': 'Z&ENet/1.0' } });
      const data = response.ok ? await response.json() : { players: [] };
      return res.status(200).json({ players: data.players || [] });
    }

    // ============ MC PROFILE ============
    if (endpoint === 'mc-profile') {
      const { uuid } = req.query;
      if (!uuid) return res.status(400).json({ error: 'UUID required' });
      const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      if (!response.ok) return res.status(404).json({ error: 'Profile not found' });
      const data = await response.json();
      return res.status(200).json({ name: data.name, id: data.id });
    }

    // ============ TREASURY STATS ============
    if (endpoint === 'treasury-stats') {
      const token = process.env.TREASURY_BUSINESS_TOKEN;
      const accountId = '123945';
      
      const [balanceRes, txnsRes, playersRes] = await Promise.all([
        fetch(`${TREASURY_API}/accounts/${accountId}/balance`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${TREASURY_API}/accounts/${accountId}/transactions?limit=10`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(BLUEMAP_URL, { headers: { 'User-Agent': 'Z&ENet/1.0' } })
      ]);
      
      const balance = balanceRes.ok ? (await balanceRes.json()).balance : 0;
      const transactions = txnsRes.ok ? (await txnsRes.json()).items : [];
      const players = playersRes.ok ? (await playersRes.json()).players : [];
      
      return res.status(200).json({ balance, recentTransactions: transactions, onlinePlayers: players });
    }

    // ============ WIKI SCRAPE ============
    if (endpoint === 'wiki-scrape' && action === 'all-pages') {
      const titlesRes = await fetch(`${WIKI_API}?action=query&list=allpages&aplimit=500&format=json`, {
        headers: { 'User-Agent': 'Z&ENet/1.0' }
      });
      if (!titlesRes.ok) return res.status(500).json({ error: 'Failed to fetch pages' });
      
      const titlesData = await titlesRes.json();
      const pages = titlesData.query?.allpages || [];
      let successCount = 0, emptyCount = 0;

      for (const page of pages) {
        try {
          const contentRes = await fetch(
            `${WIKI_API}?action=query&titles=${encodeURIComponent(page.title)}&prop=extracts&explaintext=1&format=json`,
            { headers: { 'User-Agent': 'Z&ENet/1.0' } }
          );
          
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            const pageData = Object.values(contentData.query?.pages || {})[0];
            const extract = pageData?.extract || '';
            const slug = page.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const url = `https://wiki.democracycraft.net/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
            
            const isEmpty = !extract || extract.trim().length === 0 || 
                           extract.includes('There is currently no text') ||
                           extract.includes('associated-pages') || extract.length < 20;
            
            isEmpty ? emptyCount++ : successCount++;
            
            await supabase.from('wiki_pages').upsert({
              title: page.title, slug, url, category: 'General',
              content: isEmpty ? null : extract,
              last_updated: new Date().toISOString()
            }, { onConflict: 'slug' });
          }
        } catch (e) { console.error(`Failed: ${page.title}`, e); }
        
        await new Promise(r => setTimeout(r, 100));
      }

      return res.status(200).json({ 
        success: true, total: pages.length, withContent: successCount, empty: emptyCount,
        message: `Processed ${pages.length} pages (${successCount} with content, ${emptyCount} empty)` 
      });
    }

    // ============ FORUM SCRAPE ============
    if (endpoint === 'forum-scrape' && action === 'categories') {
      const response = await fetch('https://www.democracycraft.net/forums/', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) return res.status(500).json({ error: 'Failed' });
      
      const html = await response.text();
      const categories = [];
      const regex = /<a[^>]*href="([^"]*categories[^"]*)"[^>]*>([^<]+)<\/a>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const url = match[1].startsWith('http') ? match[1] : `https://www.democracycraft.net${match[1]}`;
        const title = match[2].trim();
        if (title && !title.includes('RSS')) {
          categories.push({
            id: url.split('.').pop().replace('/', ''),
            url, title, description: ''
          });
        }
      }

      for (const cat of categories) {
        await supabase.from('forum_cache').upsert({
          type: 'category', forum_id: cat.id, title: cat.title,
          content: cat.description, url: cat.url, metadata: cat,
          last_updated: new Date().toISOString()
        }, { onConflict: 'forum_id,type' });
      }

      return res.status(200).json({ categories });
    }

    // ============ DISCORD WEBHOOK ============
    if (endpoint === 'discord-webhook' && req.method === 'POST') {
      const { message, color = 0xf97316 } = req.body;
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) return res.status(500).json({ error: 'Not configured' });
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{ title: 'Z&E Net Notification', description: message, color, timestamp: new Date().toISOString() }]
        })
      });
      
      return res.status(response.ok ? 200 : 500).json({ success: response.ok });
    }

    // ============ MANUAL DEPOSIT ============
    if (endpoint === 'manual-deposit' && req.method === 'POST') {
      const { userId, amount, reason, adminNotes } = req.body;
      if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
      
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
      const newBalance = (balData?.balance || 0) + parseFloat(amount);
      
      await supabase.from('site_balances').upsert({ user_id: userId, balance: newBalance });
      await supabase.from('manual_deposits').insert({
        user_id: userId, amount: parseFloat(amount),
        reason: reason || 'Manual deposit', admin_notes: adminNotes || ''
      });
      
      return res.status(200).json({ success: true, newBalance, message: `Added $${amount}` });
    }

    // ============ LEADERBOARD ============
    if (endpoint === 'leaderboard') {
      const { type = 'balance' } = req.query;
      
      if (type === 'balance') {
        const { data } = await supabase.from('site_balances').select('user_id, balance').order('balance', { ascending: false }).limit(50);
        return res.status(200).json({ 
          leaderboard: (data || []).map(d => ({ userId: d.user_id, name: d.user_id.slice(0, 8) + '...', value: d.balance })), 
          type: 'balance' 
        });
      }
      
      if (type === 'views') {
        const { data } = await supabase.from('sites').select('id, name, view_count, slug').order('view_count', { ascending: false }).limit(20);
        return res.status(200).json({ 
          leaderboard: (data || []).map(s => ({ name: s.name, value: s.view_count, slug: s.slug })), 
          type: 'views' 
        });
      }
      
      return res.status(400).json({ error: 'Invalid type' });
    }

    // ============ SITE OF DAY ============
    if (endpoint === 'site-of-day') {
      const { data: sites } = await supabase.from('sites').select('*');
      if (!sites || sites.length === 0) return res.status(200).json({ site: null });
      
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      return res.status(200).json({ site: sites[seed % sites.length] });
    }

    // ============ DAILY CHALLENGE ============
    if (endpoint === 'daily-challenge') {
      const categories = ['Government', 'Corporate', 'Service', 'Charity', 'Community', 'Business', 'Build Project', 'Event', 'Politics', 'Creative', 'Emergency', 'Other'];
      const today = new Date().toISOString().split('T')[0];
      
      let { data: challenge } = await supabase.from('daily_challenges').select('*').eq('date', today).single();
      
      if (!challenge) {
        const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
        const category = categories[seed % categories.length];
        const count = 3 + (seed % 5);
        
        const { data: newChallenge } = await supabase.from('daily_challenges').insert({
          date: today,
          title: `Explore ${count} ${category} sites`,
          description: `Find and visit ${count} sites in the ${category} category today!`,
          target_category: category, target_count: count
        }).select().single();
        
        challenge = newChallenge;
      }

      let progress = [];
      if (req.query.userId) {
        const { data } = await supabase.from('challenge_progress').select('site_id, sites(name, slug)').eq('user_id', req.query.userId).eq('challenge_id', challenge.id);
        progress = data || [];
      }

      return res.status(200).json({ challenge, progress, completed: progress.length >= challenge.target_count });
    }

    // ============ CHECK DEPOSITS ============
    if (endpoint === 'check-deposits') {
      const token = process.env.TREASURY_BUSINESS_TOKEN;
      const accountId = '123945';
      
      const { data: tokens } = await supabase.from('treasury_tokens').select('user_id, account_id');
      const { data: recentTxns } = await fetch(`${TREASURY_API}/accounts/${accountId}/transactions?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : { items: [] });
      
      let processed = 0;
      for (const txn of (recentTxns?.items || [])) {
        if (txn.memo?.toUpperCase().startsWith('ZEN ')) {
          const amount = parseFloat(txn.amount);
          const senderUuid = txn.from_account_id;
          const userToken = tokens.find(t => t.account_id === senderUuid);
          
          if (userToken && amount > 0) {
            const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userToken.user_id).single();
            const newBalance = (balData?.balance || 0) + amount;
            
            await supabase.from('site_balances').upsert({ user_id: userToken.user_id, balance: newBalance });
            processed++;
          }
        }
      }
      
      return res.status(200).json({ success: true, processed });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
