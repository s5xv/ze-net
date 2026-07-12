import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const now = new Date().toISOString();
    const viewerId = req.query.viewerId; // Get the user viewing the page
    let allowedCategories = ['shop', 'bank', 'casino', 'service', 'entertainment']; // Default

    // 1. If viewer is logged in, get their ad preferences
    if (viewerId) {
      const { data: profile } = await supabase.from('profiles').select('ad_preferences').eq('id', viewerId).single();
      if (profile?.ad_preferences && Array.isArray(profile.ad_preferences) && profile.ad_preferences.length > 0) {
        allowedCategories = profile.ad_preferences;
      }
    }

    // Helper to build the query with category filtering
    const buildQuery = (tier) => {
      let q = supabase.from('sites').select('*').eq('ad_tier', tier).gt('ad_expires_at', now).eq('is_verified', true);
      if (allowedCategories.length > 0) {
        q = q.in('category', allowedCategories);
      }
      return q;
    };

    // 2. Fetch and shuffle ads
    const { data: eliteAds } = await buildQuery('elite');
    const { data: premiumAds } = await buildQuery('premium');
    const { data: featuredAds } = await buildQuery('featured');
    const { data: standardAds } = await buildQuery('standard');

    res.status(200).json({
      elite: shuffleArray(eliteAds || []).slice(0, 3),
      premium: shuffleArray(premiumAds || []).slice(0, 5),
      featured: featuredAds || [],
      standard: standardAds || []
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
