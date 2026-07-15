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
  return data?.is_staff === true;
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try { if (typeof req.body === 'string') req.body = JSON.parse(req.body); } catch (_) {}
  const { action } = req.query;

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

  // --- track-view ---
  if (action === 'track-view') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId, ownerId, viewerId } = req.body;
    if (!siteId || !ownerId || !viewerId) return res.status(400).json({ error: 'Missing data' });
    if (ownerId === viewerId) return res.status(400).json({ error: 'Cannot pay yourself' });
    try {
      const { data: profile } = await supabase.from('profiles').select('mc_verified').eq('id', viewerId).maybeSingle();
      if (!profile?.mc_verified) return res.status(403).json({ success: false, message: 'Viewer not verified' });
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentView } = await supabase.from('site_views').select('id').eq('site_id', siteId).eq('viewer_id', viewerId).gte('created_at', twentyFourHoursAgo).maybeSingle();
      if (recentView) return res.status(409).json({ success: false, message: 'View already counted today' });
      const { error: viewErr } = await supabase.from('site_views').insert({ site_id: siteId, viewer_id: viewerId });
      if (viewErr) throw viewErr;
      const { error: balErr } = await supabase.rpc('increment_balance', { target_user_id: ownerId, deposit_amount: 0.10 });
      if (balErr) throw balErr;
      return res.status(200).json({ success: true, message: 'Owner paid $0.10' });
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
      const resultsText = Array.isArray(results) && results.length > 0
        ? results.slice(0, 30).filter(Boolean).map((r, i) => {
            const name = r?.name || r?.title || 'Unknown';
            const desc = r?.description || r?.content || 'No description';
            const type = r?.category ? 'Site' : (r?.content ? 'Wiki' : 'Department');
            return `${i+1}. [${type}] **${name}**: ${desc.substring(0, 200)}`;
          }).join('\n')
        : 'No results found in the directory for your query.';

      const prompt = `You are the 'Z&E Net AI Search Assistant', an expert navigation tool for the DemocracyCraft Minecraft server directory.\n\nUser Query: "${query}"\n\nDatabase Results:\n${resultsText}\n\nInstructions:\n1. STRICT RELEVANCE: Analyze the query. Discard results where the query word only appears as a substring in an unrelated word.\n2. COMPREHENSIVE LISTING: If the user is searching for a category (like "departments", "shops", "banks"), you MUST list ALL relevant items found in the database results. Do not just pick two.\n3. SYNTHESIS: Write a highly engaging summary. Start directly with the answer. Mention the specific names of the best matching sites, wiki pages, or departments.\n4. FORMATTING: Use bold text (markdown) for the names of the sites/departments to make them pop.\n5. ZERO HALLUCINATION: ONLY use the provided database results. Never invent information.\n6. NO RESULTS: If the database has no matching results but the user is asking a question, try to answer based on what you know about DemocracyCraft, or suggest they refine their search.\n\nOutput ONLY the final summary text. Do not include any introductory phrases.`;
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 400, temperature: 0.2 })
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
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,shortcut.ilike.%${q}%`)
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
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      const { error } = await supabase.from('sites').update({ status: 'approved', is_active: true, reviewed_at: new Date().toISOString() }).eq('id', siteId);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site approved. They still need to pay for verification before appearing in search.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-reject-site ---
  if (action === 'admin-reject-site') {
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      const { error } = await supabase.from('sites').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', siteId);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site rejected' });
    } catch (err) {
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

  // --- submit-review ---
  if (action === 'submit-review') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    try {
      const user = await requireUser(req);
      const { siteId, rating, comment } = req.body;
      if (!siteId) { console.error('submit-review missing siteId', req.body); return res.status(400).json({ error: 'Missing data' }); }
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
        await supabase.from('site_upvotes').insert({ user_id: user.id, site_id: siteId });
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
      return res.status(200).json({ stats: { views: views || 0, upvotes: upvotes || 0, reviews: reviews || 0, comments: comments || 0, followers: followers || 0, adViews: site.view_count || 0, adClicks: site.click_count || 0 } });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- get-site-data (reviews, comments, announcements — bypasses RLS) ---
  if (action === 'get-site-data') {
    try {
      const slug = req.body?.slug || req.query?.slug;
      if (!slug) { console.error('get-site-data: missing slug', req.body); return res.status(400).json({ error: 'Missing slug' }); }
      const { data: site } = await supabase.from('sites').select('id').eq('slug', slug).maybeSingle();
      if (!site) { console.error('get-site-data: site not found for slug', slug); return res.status(404).json({ error: 'Site not found' }); }
      const [revRes, comRes, annRes] = await Promise.allSettled([
        supabase.from('site_reviews').select('*, profiles(username)').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('site_comments').select('*, profiles(username)').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('site_announcements').select('*').eq('site_id', site.id).order('created_at', { ascending: false })
      ]);
      const reviews = revRes.status === 'fulfilled' ? (revRes.value?.data || []) : (console.error('get-site-data reviews error', revRes.reason), []);
      const comments = comRes.status === 'fulfilled' ? (comRes.value?.data || []) : (console.error('get-site-data comments error', comRes.reason), []);
      const announcements = annRes.status === 'fulfilled' ? (annRes.value?.data || []) : (console.error('get-site-data announcements error', annRes.reason), []);
      console.log(`get-site-data: slug=${slug}, reviews=${reviews.length}, comments=${comments.length}, announcements=${announcements.length}`);
      return res.status(200).json({ reviews, comments, announcements });
    } catch (err) { console.error('get-site-data error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-reports (admin: fetch all reports with profile info) ---
  if (action === 'get-reports') {
    try {
      if (!await requireAdmin(req)) { console.error('get-reports: admin check failed'); return res.status(403).json({ error: 'Admin access required' }); }
      const { data, error } = await supabase.from('site_reports').select('*, profiles(username), sites(name, slug)').order('created_at', { ascending: false }).limit(50);
      if (error) { console.error('get-reports query error', error); throw error; }
      console.log(`get-reports: returning ${data?.length || 0} reports`);
      return res.status(200).json({ reports: data || [] });
    } catch (err) { console.error('get-reports error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-transactions (admin: all transactions with profile info) ---
  if (action === 'get-transactions') {
    try {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { data, error } = await supabase.from('transactions').select('*, profiles(username)').order('created_at', { ascending: false }).limit(100);
      if (error) { console.error('get-transactions error', error); throw error; }
      console.log(`get-transactions: returning ${data?.length || 0} transactions`);
      return res.status(200).json({ transactions: data || [] });
    } catch (err) { console.error('get-transactions error', err); return res.status(500).json({ error: err.message }); }
  }

  // --- get-contact-messages (admin: all contact messages) ---
  if (action === 'get-contact-messages') {
    try {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) { console.error('get-contact-messages error', error); throw error; }
      console.log(`get-contact-messages: returning ${data?.length || 0} messages`);
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
        const { data: site } = await supabase.from('sites').select('owner_user_id, view_count').eq('id', siteId).maybeSingle();
        if (site) {
          await supabase.from('sites').update({ view_count: (site.view_count || 0) + 1 }).eq('id', siteId);
          if (site.owner_user_id) {
            await supabase.rpc('increment_balance', { target_user_id: site.owner_user_id, deposit_amount: 0.10 });
          }
        }
        return res.status(200).json({ success: true, message: 'View recorded + paid $0.10' });
      }
      return res.status(403).json({ success: false, message: 'Login required to count views' });
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
}
