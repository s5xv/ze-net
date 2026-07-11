import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { siteId, ownerId, viewerId } = req.body;
  
  // 1. Strict Input Validation
  if (!siteId || !ownerId || !viewerId) {
    return res.status(400).json({ error: 'Missing data' });
  }
  if (ownerId === viewerId) {
    return res.status(400).json({ error: 'Cannot pay yourself' });
  }

  try {
    // 2. Check if viewer is MC verified (The "Cost to Spam" Layer)
    const { data: profile } = await supabase.from('profiles').select('mc_verified').eq('id', viewerId).single();
    if (!profile?.mc_verified) {
      return res.status(200).json({ success: false, message: 'Viewer not verified' });
    }

    // 3. Check 24-Hour Cooldown (The "Database" Layer)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentView } = await supabase
      .from('site_views')
      .select('id')
      .eq('site_id', siteId)
      .eq('viewer_id', viewerId)
      .gte('created_at', twentyFourHoursAgo)
      .single();

    if (recentView) {
      return res.status(200).json({ success: false, message: 'View already counted today' });
    }

    // 4. Log the view and pay the owner
    await supabase.from('site_views').insert({ site_id: siteId, viewer_id: viewerId });
    await supabase.rpc('increment_balance', { target_user_id: ownerId, deposit_amount: 0.10 });

    res.status(200).json({ success: true, message: 'Owner paid $0.10' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
