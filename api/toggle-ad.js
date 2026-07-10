import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, isActive } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Ad ID is required' });
  }

  try {
    const { error } = await supabase
      .from('ads')
      .update({ is_active: !isActive })
      .eq('id', id);
    
    if (error) {
      console.error('Toggle error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: `Ad ${!isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Toggle ad error:', error);
    return res.status(500).json({ error: error.message });
  }
}
