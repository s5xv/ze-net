import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // Get all sites
    const { data: sites } = await supabase.from('sites').select('*').eq('is_active', true);
    
    if (!sites || sites.length === 0) {
      return res.status(200).json({ site: null });
    }

    // Use today's date as seed for consistent daily selection
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % sites.length;
    
    return res.status(200).json({ site: sites[index] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
