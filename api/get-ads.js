import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper to shuffle an array
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

    // 1. Fetch ELITE ads (Diamond border, Homepage Top Row)
    const { data: eliteAds } = await supabase
      .from('sites')
      .select('*')
      .eq('ad_tier', 'elite')
      .gt('ad_expires_at', now)
      .eq('is_verified', true);
    
    // Shuffle Elite ads if there are more than 3
    const shuffledElite = shuffleArray(eliteAds || []).slice(0, 3);

    // 2. Fetch PREMIUM ads (Purple border, Homepage Carousel)
    const { data: premiumAds } = await supabase
      .from('sites')
      .select('*')
      .eq('ad_tier', 'premium')
      .gt('ad_expires_at', now)
      .eq('is_verified', true);
      
    const shuffledPremium = shuffleArray(premiumAds || []).slice(0, 5);

    // 3. Fetch FEATURED ads (Gold border, Top of Directory)
    const { data: featuredAds } = await supabase
      .from('sites')
      .select('*')
      .eq('ad_tier', 'featured')
      .gt('ad_expires_at', now)
      .eq('is_verified', true);

    // 4. Fetch STANDARD ads (Basic badge, Sponsored Row)
    const { data: standardAds } = await supabase
      .from('sites')
      .select('*')
      .eq('ad_tier', 'standard')
      .gt('ad_expires_at', now)
      .eq('is_verified', true);

    res.status(200).json({
      elite: shuffledElite,
      premium: shuffledPremium,
      featured: featuredAds || [],
      standard: standardAds || []
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
