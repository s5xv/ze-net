import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { type = 'balance' } = req.query;

  try {
    if (type === 'balance') {
      const { data, error } = await supabase
        .from('site_balances')
        .select('user_id, balance')
        .order('balance', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Just show user IDs for now (can't easily get names without admin API)
      const leaderboard = (data || []).map(d => ({
        userId: d.user_id,
        name: d.user_id.slice(0, 8) + '...',
        value: d.balance
      }));
      
      return res.status(200).json({ leaderboard, type: 'balance' });
    }
    
    if (type === 'views') {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, view_count, slug')
        .order('view_count', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return res.status(200).json({ 
        leaderboard: (data || []).map(s => ({
          name: s.name,
          value: s.view_count,
          slug: s.slug
        })), 
        type: 'views' 
      });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: error.message });
  }
}
