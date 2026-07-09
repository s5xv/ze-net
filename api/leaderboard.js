import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { type = 'balance' } = req.query;

  try {
    if (type === 'balance') {
      const { data } = await supabase
        .from('site_balances')
        .select('user_id, balance')
        .order('balance', { ascending: false })
        .limit(50);
      
      // Fetch user profiles
      const userIds = (data || []).map(d => d.user_id);
      const { data: users } = userIds.length > 0
        ? await supabase.auth.admin.listUsers()
        : { data: { users: [] } };
      
      const userMap = {};
      (users?.users || []).forEach(u => {
        userMap[u.id] = u.user_metadata?.global_name || u.user_metadata?.name || 'User';
      });
      
      const leaderboard = (data || []).map(d => ({
        userId: d.user_id,
        name: userMap[d.user_id] || 'Anonymous',
        value: d.balance
      }));
      
      return res.status(200).json({ leaderboard, type: 'balance' });
    }
    
    if (type === 'views') {
      const { data } = await supabase
        .from('sites')
        .select('id, name, view_count, slug')
        .order('view_count', { ascending: false })
        .limit(20);
      
      return res.status(200).json({ 
        leaderboard: (data || []).map(s => ({
          name: s.name,
          value: s.view_count,
          slug: s.slug
        })), 
        type: 'views' 
      });
    }
    
    if (type === 'searches') {
      const { data } = await supabase.rpc('get_top_searchers').limit(20);
      return res.status(200).json({ leaderboard: data || [], type: 'searches' });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
