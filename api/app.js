import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // --- get-ads ---
  if (action === 'get-ads') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
    try {
      const now = new Date().toISOString();
      const viewerId = req.query.viewerId;
      let allowedCategories = ['shop', 'bank', 'casino', 'service', 'entertainment'];
      if (viewerId) {
        const { data: profile } = await supabase.from('profiles').select('ad_preferences').eq('id', viewerId).single();
        if (profile?.ad_preferences && Array.isArray(profile.ad_preferences) && profile.ad_preferences.length > 0) {
          allowedCategories = profile.ad_preferences;
        }
      }
      const buildQuery = (tier) => {
        let q = supabase.from('sites').select('*').eq('ad_tier', tier).gt('ad_expires_at', now).eq('is_verified', true);
        if (allowedCategories.length > 0) q = q.in('category', allowedCategories);
        return q;
      };
      const { data: eliteAds } = await buildQuery('elite');
      const { data: premiumAds } = await buildQuery('premium');
      const { data: featuredAds } = await buildQuery('featured');
      const { data: standardAds } = await buildQuery('standard');
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
      const { data: profile } = await supabase.from('profiles').select('mc_verified').eq('id', viewerId).single();
      if (!profile?.mc_verified) return res.status(200).json({ success: false, message: 'Viewer not verified' });
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentView } = await supabase.from('site_views').select('id').eq('site_id', siteId).eq('viewer_id', viewerId).gte('created_at', twentyFourHoursAgo).single();
      if (recentView) return res.status(200).json({ success: false, message: 'View already counted today' });
      await supabase.from('site_views').insert({ site_id: siteId, viewer_id: viewerId });
      await supabase.rpc('increment_balance', { target_user_id: ownerId, deposit_amount: 0.10 });
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
      const resultsText = (results || []).length > 0
        ? (results || []).slice(0, 30).map((r, i) => {
            const name = r.name || r.title || 'Unknown';
            const desc = r.description || r.content || 'No description';
            const type = r.category ? 'Site' : (r.content ? 'Wiki' : 'Department');
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
      if (data.error) throw new Error(data.error.message);
      const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';
      const sources = (results || []).slice(0, 5).map(r => r.name || r.title).filter(Boolean);
      return res.status(200).json({ summary, sources });
    } catch (error) {
      console.error('AI Error:', error);
      return res.status(200).json({ summary: `⚠️ AI Error: ${error.message}` });
    }
  }

  // --- submit-site (public) ---
  if (action === 'submit-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { name, url, category, description, user_id } = req.body;
    if (!name || !url || !user_id) return res.status(400).json({ error: 'Name, URL, and User are required' });
    try {
      const { data: owner } = await supabase.from('profiles').select('username').eq('id', user_id).maybeSingle();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { error } = await supabase.from('sites').insert({
        name, slug, url, category: category || 'Other', description: description || '',
        owner_user_id: user_id, user_id, owner_name: owner?.username || 'Unknown',
        is_verified: false, is_active: true, status: 'pending', submitted_by: user_id
      });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site submitted for review!' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-add-site ---
  if (action === 'admin-add-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { name, url, category, description, owner_id, owner_discord, plot_number, shortcut, discord_invite, keywords } = req.body;
    if (!name || !url || !owner_id) return res.status(400).json({ error: 'Name, URL, and Owner are required' });
    try {
      const { data: owner } = await supabase.from('profiles').select('username').eq('id', owner_id).maybeSingle();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { error } = await supabase.from('sites').insert({
        name, slug, url, category: category || 'Other', description: description || '',
        owner_user_id: owner_id, user_id: owner_id, owner_name: owner?.username || 'Unknown',
        is_verified: true, is_active: true, status: 'approved',
        shortcuts: shortcut || null, keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : null
      });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Site created' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-approve-site ---
  if (action === 'admin-approve-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      await supabase.from('sites').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', siteId);
      return res.status(200).json({ success: true, message: 'Site approved' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-reject-site ---
  if (action === 'admin-reject-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      await supabase.from('sites').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', siteId);
      return res.status(200).json({ success: true, message: 'Site rejected' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-deposit ---
  if (action === 'admin-deposit') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { userId, amount, note } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid userId or amount' });
    try {
      const { data: bal } = await supabase.from('balances').select('balance').eq('user_id', userId).maybeSingle();
      const newBal = (bal?.balance || 0) + Number(amount);
      await supabase.from('balances').upsert({ user_id: userId, balance: newBal }, { onConflict: 'user_id' });
      await supabase.from('transactions').insert({ user_id: userId, type: 'admin_deposit', amount: Number(amount), note: note || 'Manual deposit by admin' });
      return res.status(200).json({ success: true, message: `Deposited $${amount}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- admin-get-sites ---
  if (action === 'admin-get-sites') {
    try {
      const { data } = await supabase.from('sites').select('*, profiles(username)').order('created_at', { ascending: false });
      return res.status(200).json({ sites: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- admin-delete-site ---
  if (action === 'admin-delete-site') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' });
    try {
      await supabase.from('sites').delete().eq('id', siteId);
      return res.status(200).json({ success: true, message: 'Site deleted' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- submit-review ---
  if (action === 'submit-review') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId, userId, rating, comment } = req.body;
    if (!siteId || !userId) return res.status(400).json({ error: 'Missing data' });
    try {
      await supabase.from('site_reviews').insert({ site_id: siteId, user_id: userId, rating: rating || 5, comment: comment || '' });
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- submit-comment ---
  if (action === 'submit-comment') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId, userId, comment } = req.body;
    if (!siteId || !userId || !comment) return res.status(400).json({ error: 'Missing data' });
    try {
      await supabase.from('site_comments').insert({ site_id: siteId, user_id: userId, comment });
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- toggle-upvote ---
  if (action === 'toggle-upvote') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId, userId, remove } = req.body;
    if (!siteId || !userId) return res.status(400).json({ error: 'Missing data' });
    try {
      if (remove) {
        await supabase.from('site_upvotes').delete().eq('user_id', userId).eq('site_id', siteId);
      } else {
        await supabase.from('site_upvotes').insert({ user_id: userId, site_id: siteId });
      }
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- submit-report ---
  if (action === 'submit-report') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { siteId, userId, reason } = req.body;
    if (!siteId || !userId || !reason) return res.status(400).json({ error: 'Missing data' });
    try {
      await supabase.from('site_reports').insert({ site_id: siteId, user_id: userId, reason });
      return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // --- lookup-user ---
  if (action === 'lookup-user') {
    const username = req.query.username || req.body?.username;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    try {
      const { data } = await supabase.from('profiles').select('id, username, mc_username').ilike('username', username).limit(5);
      return res.status(200).json({ users: data || [] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
