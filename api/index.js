import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API = 'https://api.democracycraft.net/economy/api/v1';
const WIKI_API = 'https://wiki.democracycraft.net/api.php';
const BLUEMAP_URL = 'https://map.democracycraft.net/maps/reveille/live/players.json';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const { endpoint, action, ...params } = req.query;

  try {
    if (endpoint === 'online-players') {
      const response = await fetch(BLUEMAP_URL, { headers: { 'User-Agent': 'Z&ENet/1.0' } });
      const data = response.ok ? await response.json() : { players: [] };
      return res.status(200).json({ players: data.players || [] });
    }

    if (endpoint === 'mc-profile') {
      const { uuid } = params;
      if (!uuid) return res.status(400).json({ error: 'UUID required' });
      const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      if (!response.ok) return res.status(404).json({ error: 'Profile not found' });
      const data = await response.json();
      return res.status(200).json({ name: data.name, id: data.id });
    }

    if (endpoint === 'treasury-stats') {
      const token = process.env.TREASURY_BUSINESS_TOKEN || '';
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

    if (endpoint === 'wiki-scrape' && action === 'all-pages') {
      const titlesRes = await fetch(`${WIKI_API}?action=query&list=allpages&aplimit=500&format=json`, { headers: { 'User-Agent': 'Z&ENet/1.0' } });
      if (!titlesRes.ok) return res.status(500).json({ error: 'Failed to fetch pages' });
      const titlesData = await titlesRes.json();
      const pages = titlesData.query?.allpages || [];
      let successCount = 0, emptyCount = 0;
      for (const page of pages) {
        try {
          const contentRes = await fetch(`${WIKI_API}?action=query&titles=${encodeURIComponent(page.title)}&prop=extracts&explaintext=1&format=json`, { headers: { 'User-Agent': 'Z&ENet/1.0' } });
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            const pageData = Object.values(contentData.query?.pages || {})[0];
            const extract = pageData?.extract || '';
            const slug = page.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const url = `https://wiki.democracycraft.net/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
            const isEmpty = !extract || extract.trim().length === 0 || extract.includes('There is currently no text') || extract.includes('associated-pages') || extract.length < 20;
            isEmpty ? emptyCount++ : successCount++;
            await supabase.from('wiki_pages').upsert({ title: page.title, slug, url, category: 'General', content: isEmpty ? null : extract, last_updated: new Date().toISOString() }, { onConflict: 'slug' });
          }
        } catch (e) { console.error(`Wiki fetch failed: ${page.title}`, e); }
        await new Promise(r => setTimeout(r, 50));
      }
      return res.status(200).json({ success: true, total: pages.length, withContent: successCount, empty: emptyCount, message: `Processed ${pages.length} pages (${successCount} with content, ${emptyCount} empty)` });
    }

    if (endpoint === 'discord-webhook' && req.method === 'POST') {
      const { message, color = 0xf97316 } = req.body;
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) return res.status(500).json({ error: 'Not configured' });
      const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [{ title: 'Z&E Net', description: message, color, timestamp: new Date().toISOString() }] }) });
      return res.status(response.ok ? 200 : 500).json({ success: response.ok });
    }

    if (endpoint === 'manual-deposit' && req.method === 'POST') {
      const { userId, amount, reason, adminNotes } = req.body;
      if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userId).single();
      const newBalance = (balData?.balance || 0) + parseFloat(amount);
      await supabase.from('site_balances').upsert({ user_id: userId, balance: newBalance });
      await supabase.from('manual_deposits').insert({ user_id: userId, amount: parseFloat(amount), reason: reason || 'Manual deposit', admin_notes: adminNotes || '' });
      return res.status(200).json({ success: true, newBalance });
    }

    if (endpoint === 'leaderboard') {
      const type = params.type || 'balance';
      if (type === 'balance') {
        const { data } = await supabase.from('site_balances').select('user_id, balance').order('balance', { ascending: false }).limit(50);
        return res.status(200).json({ leaderboard: (data || []).map(d => ({ userId: d.user_id, name: d.user_id.slice(0, 8) + '...', value: d.balance })), type: 'balance' });
      }
      if (type === 'views') {
        const { data } = await supabase.from('sites').select('name, view_count, slug').order('view_count', { ascending: false }).limit(20);
        return res.status(200).json({ leaderboard: (data || []).map(s => ({ name: s.name, value: s.view_count, slug: s.slug })), type: 'views' });
      }
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (endpoint === 'daily-challenge') {
      const categories = ['Government', 'Corporate', 'Service', 'Charity', 'Community', 'Business', 'Build Project', 'Event', 'Politics', 'Creative', 'Emergency', 'Other'];
      const today = new Date().toISOString().split('T')[0];
      let { data: challenge } = await supabase.from('daily_challenges').select('*').eq('date', today).single();
      if (!challenge) {
        const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
        const category = categories[seed % categories.length];
        const count = 3 + (seed % 5);
        const { data: newChallenge } = await supabase.from('daily_challenges').insert({ date: today, title: `Explore ${count} ${category} sites`, description: `Find ${count} ${category} sites today!`, target_category: category, target_count: count }).select().single();
        challenge = newChallenge;
      }
      let progress = [];
      if (params.userId) {
        const { data } = await supabase.from('challenge_progress').select('site_id, sites(name, slug)').eq('user_id', params.userId).eq('challenge_id', challenge.id);
        progress = data || [];
      }
      return res.status(200).json({ challenge, progress, completed: progress.length >= challenge.target_count });
    }

    if (endpoint === 'check-deposits') {
      const token = process.env.TREASURY_BUSINESS_TOKEN || '';
      const accountId = '123945';
      const { data: tokens } = await supabase.from('treasury_tokens').select('user_id, account_id');
      let processed = 0;
      try {
        const res = await fetch(`${TREASURY_API}/accounts/${accountId}/transactions?limit=20`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const { items } = await res.json();
          for (const txn of items || []) {
            if (txn.memo?.toUpperCase().startsWith('ZEN ')) {
              const amount = parseFloat(txn.amount);
              const userToken = tokens.find(t => t.account_id === txn.from_account_id);
              if (userToken && amount > 0) {
                const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', userToken.user_id).single();
                await supabase.from('site_balances').upsert({ user_id: userToken.user_id, balance: (balData?.balance || 0) + amount });
                processed++;
              }
            }
          }
        }
      } catch (e) { console.error('Deposit check failed', e); }
      return res.status(200).json({ success: true, processed });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
