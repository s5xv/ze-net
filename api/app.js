import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.split(' ')[1]);
  if (error || !user) return null;
  return user;
};

const requireAdmin = async (req) => {
  const user = await getUser(req);
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('is_staff').eq('id', user.id).maybeSingle();
  if (data?.is_staff === true) return true;
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_staff', true);
  return count === 0;
};

const requireUser = async (req) => {
  const user = await getUser(req);
  if (!user) throw new Error('Authentication required');
  return user;
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const BAD_WORDS = ['spam', 'buy now', 'click here', 'free money', 'casino', 'xxx', 'viagra'];
const isSpam = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (BAD_WORDS.some(w => lower.includes(w))) return true;
  const repeated = text.replace(/[^a-zA-Z0-9]/g, '');
  if (repeated.length > 20 && new Set([...repeated.toLowerCase()]).size <= 3) return true;
  if (text.split(' ').filter(w => w.length > 3 && w === w.toUpperCase()).length > 5) return true;
  return false;
};

const DISCORD_BOT_URL = 'https://discord.com/api/webhooks/1527818173213315245/Pp77iAVJ-Z-CMhVzqMIvJl3CoHCYIhph9M2lHHKE1lI3qwsmJuE-jKNp8F6yNgdYKBVE';
const sendDiscordAlert = async (msg) => {
  try { await fetch(DISCORD_BOT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: msg }) }); } catch(e) {}
};

const logAdminAction = async (adminId, action, targetType, targetId, details) => {
  try { await supabase.from('admin_audit_logs').insert({ admin_id: adminId, action, target_type: targetType, target_id: String(targetId), details: details ? JSON.parse(JSON.stringify(details)) : null }); } catch(e) {}
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try { if (typeof req.body === 'string') req.body = JSON.parse(req.body); } catch (_) {}
  const { action } = req.query;

  try {

  // --- get-departments ---
  if (action === 'get-departments') {
    try {
      const { data } = await supabase.from('departments').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(50);
      return res.status(200).json({ departments: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- get-trending ---
  if (action === 'get-trending') {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentViews, error: viewErr } = await supabase.from('site_views').select('site_id').gte('created_at', weekAgo);
      if (viewErr) return res.status(500).json({ error: viewErr.message });
      const viewCounts = {};
      (recentViews || []).forEach(v => { viewCounts[v.site_id] = (viewCounts[v.site_id] || 0) + 1; });
      const sorted = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (sorted.length === 0) return res.status(200).json({ sites: [] });
      const ids = sorted.map(s => s[0]);
      const { data: sites } = await supabase.from('sites').select('*').eq('status', 'approved').in('id', ids);
      const siteMap = Object.fromEntries((sites || []).map(s => [s.id, s]));
      return res.status(200).json({ sites: sorted.map(([id]) => siteMap[id]).filter(Boolean) });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- get-ads ---
  if (action === 'get-ads') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
    try {
      const now = new Date().toISOString();
      const viewerId = req.query.viewerId;
      let allowedCategories = ['shop', 'bank', 'casino', 'service', 'entertainment'];
      if (viewerId) {
        const { data: profile, error: profileErr } = await supabase.from('profiles').select('ad_preferences').eq('id', viewerId).maybeSingle();
        if (!profileErr && profile?.ad_preferences && Array.isArray(profile.ad_preferences) && profile.ad_preferences.length > 0) {
          allowedCategories = profile.ad_preferences;
        }
      }
      const buildQuery = async (tier) => {
        let q = supabase.from('sites').select('*').eq('ad_tier', tier).gt('ad_expires_at', now).eq('is_verified', true);
        if (allowedCategories.length > 0) q = q.in('category', allowedCategories);
        const { data, error } = await q;
        if (error) return [];
        return data || [];
      };
      const [eliteAds, premiumAds, featuredAds, standardAds] = await Promise.all([
        buildQuery('elite'), buildQuery('premium'), buildQuery('featured'), buildQuery('standard')
      ]);
      return res.status(200).json({
        elite: shuffleArray(eliteAds || []).slice(0, 3),
        premium: shuffleArray(premiumAds || []).slice(0, 5),
        featured: featuredAds || [],
        standard: standardAds || []
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- admin-mod-action ---
  if (action === 'admin-mod-action') {
    if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
    const { reportId, siteId, action: modAction } = req.body;
    try {
      if (modAction === 'remove') {
        await supabase.from('site_reports').delete().eq('id', reportId);
        await supabase.from('sites').update({ is_verified: false, is_active: false }).eq('id', siteId);
      } else {
        await supabase.from('site_reports').update({ status: 'dismissed' }).eq('id', reportId);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  // --- admin staff management ---
  for (const [actionName, updateFields] of Object.entries({
    'admin-add-staff': { is_staff: true, staff_permissions: [] },
    'admin-remove-staff': { is_staff: false, staff_permissions: null }
  })) {
    if (action === actionName) {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      try {
        await supabase.from('profiles').update(updateFields).eq('id', userId);
        return res.json({ success: true });
      } catch (err) { return res.status(500).json({ error: err.message }); }
    }
  }

  if (action === 'admin-update-staff-perms') {
    if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
    const { userId, permissions } = req.body;
    try {
      await supabase.from('profiles').update({ staff_permissions: permissions }).eq('id', userId);
      return res.json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- update-ad-image ---
  if (action === 'update-ad-image') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const { adId, imageUrl } = req.body;
      if (!adId) return res.status(400).json({ error: 'adId required' });
      const { error } = await supabase.from('ads').update({ image_url: imageUrl || '' }).eq('id', adId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- track-ad-click ---
  if (action === 'track-ad-click') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const { adId } = req.body;
      if (!adId) return res.status(400).json({ error: 'adId required' });
      const { data: ad } = await supabase.from('ads').select('click_count, link_url').eq('id', adId).maybeSingle();
      if (ad) {
        await supabase.from('ads').update({ click_count: (ad.click_count || 0) + 1 }).eq('id', adId);
        if (ad.link_url?.startsWith('/site/')) {
          const slug = ad.link_url.replace('/site/', '');
          const { data: site } = await supabase.from('sites').select('id, click_count').eq('slug', slug).maybeSingle();
          if (site) {
            await supabase.from('sites').update({ click_count: (site.click_count || 0) + 1 }).eq('id', site.id);
          }
        }
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- revoke-ad ---
  if (action === 'revoke-ad') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const { adId } = req.body;
      if (!adId) return res.status(400).json({ error: 'adId required' });
      const { error } = await supabase.from('ads').update({ is_active: false }).eq('id', adId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- revoke-site-ad ---
  if (action === 'revoke-site-ad') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const { siteId } = req.body;
      if (!siteId) return res.status(400).json({ error: 'siteId required' });
      const { error } = await supabase.from('sites').update({ ad_tier: null, ad_expires_at: null }).eq('id', siteId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- summarize ---
  if (action === 'summarize') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { query, results } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    try {
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) return res.status(200).json({ summary: "⚠️ AI is ready, but the MISTRAL_API_KEY is missing! Go to Vercel Dashboard > Settings > Environment Variables and add it." });

      const hasResults = Array.isArray(results) && results.length > 0;
      const resultsText = hasResults
        ? results.slice(0, 60).filter(Boolean).map((r, i) => {
            const name = r?.name || r?.title || r?.business_name || 'Unknown';
            const desc = r?.description || r?.content || '';
            const type = r?.category ? 'Site' : (r?.content ? 'Wiki' : (r?.forum_title ? 'Forum Thread' : 'Department'));
            const extra = [];
            if (r?.category) extra.push(`Category: ${r.category}`);
            if (r?.subcategory) extra.push(`Subcategory: ${r.subcategory}`);
            if (r?.slug) extra.push(`URL: /site/${r.slug}`);
            if (r?.view_count !== undefined) extra.push(`Views: ${r.view_count}`);
            if (r?.shortcut) extra.push(`Shortcut: /${r.shortcut}`);
            if (r?.is_verified) extra.push('Verified');
            return `--- Item ${i+1} ---\nType: ${type}\nName: ${name}\nDescription: ${desc ? desc.substring(0, 500) : 'No description'}\n${extra.join(' | ')}`;
          }).join('\n\n')
        : 'No results found in the directory for this query.';

      const prompt = `You are the Z&E Net AI Assistant for the DemocracyCraft Minecraft server directory. You help users find shops, services, government departments, and information.

ABOUT DEMOCRACYCRAFT:
- Towny/economy/political roleplay server with player-run shops, government, and businesses
- Categories: Retail, Restaurant, Real Estate, Bank, Legal, Services, Farm, Entertainment, Government, Tech/Redstone, Transport, Hotel
- Sites have view counts, reviews, ratings, tags, and status badges (Open/Closed/Busy)
- Users can bookmark, follow, upvote, and review sites

USER QUERY: "${query}"

${hasResults ? `DATABASE RESULTS (use these primarily):\n\n${resultsText}\n\nIf the user asks for recommendations or comparisons, synthesize the data. If listing, keep it organized. Use bold for names. Feel free to group results by category or type. You can add brief context about what each place offers based on the description.` : 'No specific database results matched this query. Use your general knowledge about DemocracyCraft to answer helpfully, but do not invent specific shops or players. Suggest the user try a different search term.'}

RULES:
- Be concise but helpful — 2-5 sentences usually enough
- Bold **names** of sites/places
- If listing multiple items, use bullet points
- If the user seems frustrated or searching for something specific that isnt found, suggest alternative search terms
- You can answer general DemocracyCraft questions from your knowledge (economy, towny, plugins, etc.)
- Never invent specific sites, shops, or players that don't come from the database results
- Be friendly and conversational — use emojis occasionally 🏪 🏦 🏛️
- If recommending, explain WHY briefly based on description or category
- If no results at all, acknowledge it and offer to help with something else`;

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'system', content: 'You are Z&E Net AI, a helpful assistant for the DemocracyCraft Minecraft server directory. You help players find shops, services, and information. You are friendly, concise, and knowledgeable.' }, { role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.4 })
      });
      const data = await response.json();
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : (data.error?.message || 'AI API error'));
      const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';
      const sources = (results || []).slice(0, 5).map(r => r.name || r.title).filter(Boolean);
      return res.status(200).json({ summary, sources });
    } catch (error) {
      console.error('AI Error:', error);
      return res.status(200).json({ summary: `⚠️ AI Error: ${error.message}` });
    }
  }

  // --- search-sites ---
  if (action === 'search-sites') {
    try {
      const q = (req.body?.q || req.query?.q || '').toLowerCase().trim();
      if (!q) return res.status(400).json({ error: 'Missing query' });
      const { data: sites } = await supabase.from('sites').select('*').eq('status', 'approved')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,shortcut.ilike.%${q}%,category.ilike.%${q}%`)
        .order('view_count', { ascending: false }).limit(15);
      return res.status(200).json({ sites: sites || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- submit-site ---
  if (action === 'submit-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { name, website_url, owner_discord, category, description, plot_number, shortcut, discord_invite } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const user_id = user.id;
      const { data: owner, error: profileErr } = await supabase.from('profiles').select('username').eq('id', user_id).maybeSingle();
      if (profileErr || !owner) return res.status(400).json({ error: 'User not found' });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { error } = await supabase.from('sites').insert({
        name, slug, url: website_url || '', category: category || 'Other',
        description: description || '',
        plot_number: plot_number || null, shortcut: shortcut || null,
        discord_invite: discord_invite || null,
        owner_user_id: user_id, user_id, owner_name: owner?.username || 'Unknown',
        is_verified: false, is_active: true, status: 'pending', submitted_by: user_id
      });
      if (error) {
        console.error("SITE INSERT ERROR:", error);
        return res.status(500).json({ error: error.message });
      }
      await sendDiscordAlert(`📝 New site submitted: **${name}** (${category}) by ${owner?.username} — awaiting review`);
      return res.status(200).json({ success: true, message: 'Site submitted for review!' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-auth guard ---
  if (action.startsWith('admin-')) {
    if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
    if (req.method === 'GET' && ['admin-get-sites', 'admin-get-pending-sites'].includes(action)) {} else if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  }

  // --- admin-add-site ---
  const isValidUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  if (action === 'admin-add-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { name, url, category, description, owner_id, discord_id, owner_discord, plot_number, shortcut, discord_invite, keywords } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!owner_id && !discord_id) return res.status(400).json({ error: 'Either Owner UUID or Discord ID is required' });
    if (owner_id && !isValidUuid(owner_id)) return res.status(400).json({ error: /^\d{17,19}$/.test(owner_id) ? 'That looks like a Discord ID, not a User ID. Type their Discord username in the field above and click a result from the dropdown.' : 'Owner ID must be a valid UUID. Use the Discord username lookup above.' });
    try {
      let ownerName = 'Unknown';
      if (owner_id) {
        const { data: owner } = await supabase.from('profiles').select('username').eq('id', owner_id).maybeSingle();
        if (owner) ownerName = owner.username;
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { error } = await supabase.from('sites').insert({
        name, slug, url: url || '', category: category || 'Other', description: description || '',
        owner_user_id: owner_id || null, user_id: owner_id || null, owner_name: ownerName,
        discord_id: discord_id || null,
        plot_number: plot_number || null,
        discord_invite: discord_invite || null,
        is_verified: false, is_active: true, status: 'approved',
        shortcut: shortcut || null, keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : null
      });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site created' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-approve-site ---
  if (action === 'admin-approve-site') {
    const { siteId } = req.body;
    console.log('admin-approve-site called', { siteId, body: req.body });
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      const { data: existing, error: fetchErr } = await supabase.from('sites').select('id, name').eq('id', siteId).maybeSingle();
      console.log('Existing site type:', typeof siteId, 'value:', JSON.stringify(siteId).slice(0, 100));
      if (fetchErr) { console.error('Fetch existing error:', fetchErr); throw fetchErr; }
      if (!existing) return res.status(404).json({ error: 'Site not found. ID: ' + JSON.stringify(siteId) });
      const { error } = await supabase.from('sites').update({ status: 'approved', is_active: true }).eq('id', siteId);
      if (error) throw error;
      const { data: site } = await supabase.from('sites').select('name, slug').eq('id', siteId).maybeSingle();
      try { const user = await getUser(req); if (user) await logAdminAction(user.id, 'approve-site', 'sites', siteId, { name: site?.name }); } catch(e) {}
      await sendDiscordAlert(`✅ Site approved: **${site?.name || siteId}** — https://ze-net-beryl.vercel.app/site/${site?.slug || siteId}`);
      return res.status(200).json({ success: true, message: 'Site approved.' });
    } catch (err) {
      console.error('admin-approve-site error:', err);
      return res.status(500).json({ error: err.message, stack: err.stack });
    }
  }

  // --- admin-reject-site ---
  if (action === 'admin-reject-site') {
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      const { data: existing, error: fetchErr } = await supabase.from('sites').select('id').eq('id', siteId).maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing) return res.status(404).json({ error: 'Site not found' });
      const { error } = await supabase.from('sites').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', siteId);
      if (error) throw error;
      const { data: site } = await supabase.from('sites').select('name').eq('id', siteId).maybeSingle();
      try { const user = await getUser(req); if (user) await logAdminAction(user.id, 'reject-site', 'sites', siteId, { name: site?.name }); } catch(e) {}
      await sendDiscordAlert(`❌ Site rejected: **${site?.name || siteId}**`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('admin-reject-site error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-deposit ---
  if (action === 'admin-deposit') {
    const { userId, amount, note } = req.body;
    const depositAmount = Number(amount);
    if (!userId || !amount || isNaN(depositAmount) || depositAmount <= 0) return res.status(400).json({ error: 'Invalid userId or amount' });
    try {
      const { data: bal, error: balErr } = await supabase.from('balances').select('balance').eq('user_id', userId).maybeSingle();
      if (balErr) throw balErr;
      const currentBal = bal?.balance || 0;
      const { error: upsertErr } = await supabase.from('balances').upsert({ user_id: userId, balance: currentBal + depositAmount }, { onConflict: 'user_id' });
      if (upsertErr) throw upsertErr;
      const { error: txnErr } = await supabase.from('transactions').insert({ user_id: userId, type: 'admin_deposit', amount: depositAmount, note: note || 'Manual deposit by admin' });
      if (txnErr) throw txnErr;
      return res.status(200).json({ success: true, message: `Deposited $${amount}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-get-sites ---
  if (action === 'admin-get-sites') {
    try {
      console.log('admin-get-sites: querying sites table');
      const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
      console.log('admin-get-sites: result', data, error);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ sites: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- admin-get-pending-sites ---
  if (action === 'admin-get-pending-sites') {
    try {
      console.log('Fetching pending sites from sites table...');
      
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Pending sites query error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('Found pending sites:', data?.length || 0);
      return res.status(200).json({ sites: data || [] });

    } catch (err) {
      console.error('Pending sites endpoint error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-delete-site ---
  if (action === 'admin-delete-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      const { error } = await supabase.from('sites').delete().eq('id', siteId);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site deleted' });
    } catch (err) {
      return res.status(500).json({ error: 'Delete failed' });
    }
  }

  // --- tip ---
  if (action === 'tip') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { targetUserId, amount } = req.body;
      if (!targetUserId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid target or amount' });

      // Check balance
      const { data: balRow } = await supabase.from('balances').select('balance').eq('user_id', user.id).maybeSingle();
      const balance = balRow?.balance ?? 0;
      if (balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

      // Deduct from sender
      const { error: deductErr } = await supabase.rpc('increment_balance', { target_user_id: user.id, deposit_amount: -amount });
      if (deductErr) { console.error('tip deduct error', deductErr); return res.status(500).json({ error: 'Deduction failed' }); }

      // Add to recipient
      const { error: addErr } = await supabase.rpc('increment_balance', { target_user_id: targetUserId, deposit_amount: amount });
      if (addErr) {
        // Refund sender
        await supabase.rpc('increment_balance', { target_user_id: user.id, deposit_amount: amount });
        console.error('tip add error', addErr);
        return res.status(500).json({ error: 'Failed to credit recipient' });
      }

      // Record transaction for sender
      await supabase.from('transactions').insert({
        txn_id: 'TIP-' + Date.now(),
        user_id: user.id,
        amount: -amount,
        type: 'tip',
        ref_id: 'tip-' + Date.now(),
        note: `Tip to ${targetUserId}`
      });

      return res.status(200).json({ success: true });
    } catch (err) { console.error('tip error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- submit-review ---
  if (action === 'submit-review') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { siteId, rating, comment } = req.body;
      if (!siteId) { console.error('submit-review missing siteId', req.body); return res.status(400).json({ error: 'Missing data' }); }
      if (isSpam(comment)) {
        const { data: site } = await supabase.from('sites').select('name').eq('id', siteId).maybeSingle();
        await sendDiscordAlert(`🛑 Spam review detected from ${user.id} on "${site?.name || siteId}": "${comment.slice(0, 100)}"`);
        return res.status(400).json({ error: 'Review flagged as spam. Please try again.' });
      }
      const { error } = await supabase.from('site_reviews').upsert({ site_id: siteId, user_id: user.id, rating: rating || 5, comment: comment || '' }, { onConflict: 'user_id,site_id' });
      if (error) { console.error('submit-review upsert error', error); throw error; }
      return res.status(200).json({ success: true });
    } catch (err) { console.error('submit-review error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- submit-comment ---
  if (action === 'submit-comment') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { siteId, comment } = req.body;
      if (!siteId || !comment) { console.error('submit-comment missing data', req.body); return res.status(400).json({ error: 'Missing data' }); }
      if (isSpam(comment)) {
        const { data: site } = await supabase.from('sites').select('name').eq('id', siteId).maybeSingle();
        await sendDiscordAlert(`🛑 Spam comment detected from ${user.id} on "${site?.name || siteId}": "${comment.slice(0, 100)}"`);
        return res.status(400).json({ error: 'Comment flagged as spam. Please try again.' });
      }
      const { error } = await supabase.from('site_comments').insert({ site_id: siteId, user_id: user.id, comment });
      if (error) { console.error('submit-comment insert error', error); throw error; }
      return res.status(200).json({ success: true });
    } catch (err) { console.error('submit-comment error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- toggle-upvote ---
  if (action === 'toggle-upvote') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { siteId, remove } = req.body;
      if (!siteId) return res.status(400).json({ error: 'Missing data' });
      if (remove) {
        await supabase.from('site_upvotes').delete().eq('user_id', user.id).eq('site_id', siteId);
      } else {
        await supabase.from('site_upvotes').upsert({ user_id: user.id, site_id: siteId }, { onConflict: 'user_id, site_id', ignoreDuplicates: true });
      }
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- submit-report ---
  if (action === 'submit-report') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { siteId, reason } = req.body;
      if (!siteId || !reason) { console.error('submit-report missing data', req.body); return res.status(400).json({ error: 'Missing data' }); }
      const { error } = await supabase.from('site_reports').insert({ site_id: siteId, user_id: user.id, reason });
      if (error) { console.error('submit-report insert error', error); throw error; }
      return res.status(200).json({ success: true });
    } catch (err) { console.error('submit-report error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- approve-business (migrate business_registration → sites) ---
  if (action === 'approve-business') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing business registration id' });
    try {
      const { data: biz } = await supabase.from('business_registrations').select('*').eq('id', id).maybeSingle();
      if (!biz) return res.status(404).json({ error: 'Business registration not found' });
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', biz.user_id).maybeSingle();
      const keywords = biz.keywords ? biz.keywords.split(',').map(k => k.trim()).filter(Boolean) : null;
      const slug = biz.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { error: insertErr } = await supabase.from('sites').insert({
        name: biz.business_name, slug, url: biz.website_url || '', category: biz.category || 'Other',
        description: biz.description || '', plot_number: biz.plot_number, shortcut: biz.shortcut,
        discord_invite: biz.discord_invite, owner_user_id: biz.user_id, user_id: biz.user_id,
        discord_id: biz.discord_id || null,
        owner_name: profile?.username || 'Unknown', submitted_by: biz.user_id, keywords,
        is_verified: false, is_active: true, status: 'approved'
      });
      if (insertErr) throw insertErr;
      await supabase.from('business_registrations').update({ status: 'approved' }).eq('id', id);
      return res.status(200).json({ success: true, message: 'Business approved and added to sites' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- get-analytics ---
  if (action === 'get-analytics') {
    try {
      const user = await requireUser(req);
      const { slug } = req.query;
      if (!slug) return res.status(400).json({ error: 'Missing slug' });
      const { data: site } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
      if (!site) return res.status(404).json({ error: 'Site not found' });
      if (site.owner_user_id !== user.id) return res.status(403).json({ error: 'Not your site' });
      const { count: views } = await supabase.from('site_views').select('*', { count: 'exact', head: true }).eq('site_id', site.id);
      const { count: upvotes } = await supabase.from('site_upvotes').select('*', { count: 'exact', head: true }).eq('site_id', site.id);
      const { count: reviews } = await supabase.from('site_reviews').select('*', { count: 'exact', head: true }).eq('site_id', site.id);
      const { count: comments } = await supabase.from('site_comments').select('*', { count: 'exact', head: true }).eq('site_id', site.id);
      const { count: followers } = await supabase.from('site_followers').select('*', { count: 'exact', head: true }).eq('site_id', site.id);
      const hasAds = site.ad_tier && site.ad_expires_at && new Date(site.ad_expires_at) > new Date();
      return res.status(200).json({ stats: { views: views || 0, upvotes: upvotes || 0, reviews: reviews || 0, comments: comments || 0, followers: followers || 0, hasAds, adViews: hasAds ? (site.view_count || 0) : null, adClicks: hasAds ? (site.click_count || 0) : null } });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- get-site-data (reviews, comments, announcements — bypasses RLS) ---
  if (action === 'get-site-data') {
    try {
      const slug = req.body?.slug || req.query?.slug;
      if (!slug) { console.error('get-site-data: missing slug', req.body); return res.status(400).json({ error: 'Missing slug' }); }
      const { data: site } = await supabase.from('sites').select('id').eq('slug', slug).maybeSingle();
      if (!site) { console.error('get-site-data: site not found for slug', slug); return res.status(404).json({ error: 'Site not found' }); }
      const [revRes, comRes, annRes, profRes] = await Promise.allSettled([
        supabase.from('site_reviews').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('site_comments').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('site_announcements').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, username')
      ]);
      const reviews = revRes.status === 'fulfilled' ? (revRes.value?.data || []) : (console.error('get-site-data reviews error', revRes.reason), []);
      const comments = comRes.status === 'fulfilled' ? (comRes.value?.data || []) : (console.error('get-site-data comments error', comRes.reason), []);
      const announcements = annRes.status === 'fulfilled' ? (annRes.value?.data || []) : (console.error('get-site-data announcements error', annRes.reason), []);
      const allProfiles = profRes.status === 'fulfilled' ? (profRes.value?.data || []) : [];
      const profileMap = Object.fromEntries(allProfiles.map(p => [p.id, p.username]));
      reviews.forEach(r => r.profiles = r.profiles || { username: profileMap[r.user_id] || 'Unknown' });
      comments.forEach(c => c.profiles = c.profiles || { username: profileMap[c.user_id] || 'Unknown' });
      console.log(`get-site-data: slug=${slug}, reviews=${reviews.length}, comments=${comments.length}, announcements=${announcements.length}`);
      return res.status(200).json({ reviews, comments, announcements });
    } catch (err) { console.error('get-site-data error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-reports (admin: fetch all reports with profile info) ---
  if (action === 'get-reports') {
    try {
      if (!await requireAdmin(req)) { console.error('get-reports: admin check failed'); return res.status(403).json({ error: 'Admin access required' }); }
      const [repRes, profRes, siteRes] = await Promise.allSettled([
        supabase.from('site_reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('id, username'),
        supabase.from('sites').select('id, name, slug')
      ]);
      const reports = repRes.status === 'fulfilled' ? (repRes.value?.data || []) : [];
      const profiles = profRes.status === 'fulfilled' ? (profRes.value?.data || []) : [];
      const sites = siteRes.status === 'fulfilled' ? (siteRes.value?.data || []) : [];
      const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.username]));
      const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));
      reports.forEach(r => { r.profiles = { username: profileMap[r.user_id] || 'Unknown' }; r.sites = siteMap[r.site_id] || null; });
      return res.status(200).json({ reports: reports || [] });
    } catch (err) { console.error('get-reports error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-transactions (admin: all transactions with profile info) ---
  if (action === 'get-transactions') {
    try {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const [txRes, profRes] = await Promise.allSettled([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id, username')
      ]);
      const transactions = txRes.status === 'fulfilled' ? (txRes.value?.data || []) : [];
      const profiles = profRes.status === 'fulfilled' ? (profRes.value?.data || []) : [];
      const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.username]));
      transactions.forEach(t => t.profiles = { username: profileMap[t.user_id] || 'Unknown' });
      return res.status(200).json({ transactions });
    } catch (err) { console.error('get-transactions error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-contact-messages (admin: all contact messages) ---
  if (action === 'get-contact-messages') {
    try {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) { console.error('get-contact-messages error', error); throw error; }
      return res.status(200).json({ messages: data || [] });
    } catch (err) { console.error('get-contact-messages error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- record-view (anti-spam + pay 10c per view) ---
  if (action === 'record-view') {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      let paid = false;
      if (user) {
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recent } = await supabase.from('site_views').select('*', { count: 'exact', head: true }).eq('site_id', siteId).eq('viewer_id', user.id).gte('created_at', thirtyMinAgo);
        if (recent > 0) return res.status(429).json({ success: false, message: 'View already counted (30-min cooldown)' });
        const { count: daily } = await supabase.from('site_views').select('*', { count: 'exact', head: true }).eq('site_id', siteId).eq('viewer_id', user.id).gte('created_at', oneDayAgo);
        if (daily >= 3) return res.status(429).json({ success: false, message: 'Max 3 views/day on this site' });
        await supabase.from('site_views').insert({ site_id: siteId, viewer_id: user.id });
        const { data: site } = await supabase.from('sites').select('owner_user_id').eq('id', siteId).maybeSingle();
        if (site) {
          await supabase.rpc('increment_view_count', { p_site_id: siteId });
          if (site.owner_user_id) {
            await supabase.rpc('increment_balance', { target_user_id: site.owner_user_id, deposit_amount: 0.10 });
          }
        }
        return res.status(200).json({ success: true, message: 'View recorded + paid $0.10' });
      }
      return res.status(403).json({ success: false, message: 'Login required to count views' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: search ---
  if (action === 'search-gigs') {
    try {
      const { q, category, sort, minPrice, maxPrice } = req.query;
      let query = supabase.from('gigs').select('*, profiles!inner(username, avatar_url)').eq('status', 'active');
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      if (category && category !== 'All') query = query.eq('category', category);
      if (minPrice) query = query.gte('price', parseFloat(minPrice));
      if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
      if (sort === 'price_asc') query = query.order('price', { ascending: true });
      else if (sort === 'price_desc') query = query.order('price', { ascending: false });
      else if (sort === 'oldest') query = query.order('created_at', { ascending: true });
      else query = query.order('created_at', { ascending: false });
      const { data } = await query.limit(50);
      return res.status(200).json({ gigs: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: get categories ---
  if (action === 'get-gig-categories') {
    try {
      const { data } = await supabase.from('gigs').select('category').eq('status', 'active');
      const cats = [...new Set((data || []).map(g => g.category).filter(Boolean))].sort();
      return res.status(200).json({ categories: cats });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: get one ---
  if (action === 'get-gig') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data } = await supabase.from('gigs').select('*, profiles!inner(username, avatar_url)').eq('id', id).maybeSingle();
      if (!data) return res.status(404).json({ error: 'Gig not found' });
      return res.status(200).json({ gig: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: create ---
  if (action === 'create-gig') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { title, description, category, price, price_type, delivery_days, discord_username } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });
      const { data, error } = await supabase.from('gigs').insert({
        user_id: user.id, title, description: description || '', category: category || 'Other',
        price: parseFloat(price) || 0, price_type: price_type || 'fixed',
        delivery_days: parseInt(delivery_days) || 7, discord_username: discord_username || ''
      }).select().maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ gig: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: update ---
  if (action === 'update-gig') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { id, title, description, category, price, price_type, delivery_days, discord_username, status } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data: existing } = await supabase.from('gigs').select('user_id').eq('id', id).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Gig not found' });
      if (existing.user_id !== user.id) return res.status(403).json({ error: 'Not your gig' });
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (price !== undefined) updates.price = parseFloat(price);
      if (price_type !== undefined) updates.price_type = price_type;
      if (delivery_days !== undefined) updates.delivery_days = parseInt(delivery_days);
      if (discord_username !== undefined) updates.discord_username = discord_username;
      if (status !== undefined) updates.status = status;
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('gigs').update(updates).eq('id', id).select().maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ gig: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- gigs: my gigs ---
  if (action === 'my-gigs') {
    try {
      const user = await requireUser(req);
      const { data } = await supabase.from('gigs').select('*, profiles!inner(username, avatar_url)').eq('user_id', user.id).order('created_at', { ascending: false });
      return res.status(200).json({ gigs: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- admin: list all gigs ---
  if (action === 'admin-list-gigs') {
    if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    try {
      const { data } = await supabase.from('gigs').select('*, profiles!inner(username)').order('created_at', { ascending: false });
      return res.status(200).json({ gigs: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- admin: delete gig ---
  if (action === 'admin-delete-gig') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await supabase.from('gigs').delete().eq('id', id);
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- lookup-user ---
  if (action === 'lookup-user') {
    const raw = req.query.username || req.body?.username;
    if (!raw) return res.status(400).json({ error: 'Missing username' });
    const safe = raw.replace(/[%_]/g, '\\$&');
    try {
      const { data } = await supabase.from('profiles').select('id, username, mc_username').ilike('username', `%${safe}%`).limit(5);
      return res.status(200).json({ users: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(400).json({ error: 'Invalid action' });

  } catch (globalErr) {
    console.error('Unhandled error:', globalErr);
    return res.status(500).json({ error: globalErr.message || 'Internal error' });
  }
}
