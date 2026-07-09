import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIES = ['Government', 'Corporate', 'Service', 'Charity', 'Community', 'Business', 'Build Project', 'Event', 'Politics', 'Creative', 'Emergency', 'Other'];

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if today's challenge exists
    let { data: challenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .single();

    // If not, generate one
    if (!challenge) {
      const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
      const category = CATEGORIES[seed % CATEGORIES.length];
      const count = 3 + (seed % 5); // 3-7 sites
      
      const titles = [
        `Explore ${count} ${category} sites`,
        `Discover ${count} ${category} gems`,
        `Visit ${count} ${category} pages`,
        `${category} Explorer: Find ${count} sites`,
      ];
      
      const { data: newChallenge } = await supabase
        .from('daily_challenges')
        .insert({
          date: today,
          title: titles[seed % titles.length],
          description: `Find and visit ${count} sites in the ${category} category today!`,
          target_category: category,
          target_count: count
        })
        .select()
        .single();
      
      challenge = newChallenge;
    }

    // Get user progress if logged in
    let progress = [];
    const userId = req.query.userId;
    if (userId) {
      const { data } = await supabase
        .from('challenge_progress')
        .select('site_id, sites(name, slug)')
        .eq('user_id', userId)
        .eq('challenge_id', challenge.id);
      progress = data || [];
    }

    return res.status(200).json({ 
      challenge, 
      progress,
      completed: progress.length >= challenge.target_count
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
