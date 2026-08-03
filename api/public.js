import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const validateKey = async (key) => {
  if (!key || !key.startsWith('zn_')) return null;
  const key_hash = crypto.createHash('sha256').update(key).digest('hex');
  const { data } = await supabase.from('api_keys').select('id, user_id').eq('key_hash', key_hash).maybeSingle();
  if (!data) return null;
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return data;
};

const publicSite = (s) => s ? ({
  slug: s.slug, name: s.name, category: s.category, subcategory: s.subcategory,
  description: s.description, url: s.url, image_url: s.image_url,
  plot_number: s.plot_number, is_verified: s.is_verified, view_count: s.view_count,
  business_hours: s.business_hours, catalog: s.catalog, gallery_images: s.gallery_images,
  video_url: s.video_url, banner_image_url: s.banner_image_url, accent_color: s.accent_color,
  spotlights: s.spotlight, created_at: s.created_at, updated_at: s.updated_at
}) : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { key, action, q, slug, category, limit, offset } = req.query;

  const apiKey = await validateKey(key);
  if (!apiKey) return res.status(401).json({ error: 'Invalid or missing API key' });

  const lim = Math.min(parseInt(limit) || 25, 100);
  const off = parseInt(offset) || 0;

  try {
    if (action === 'sites') {
      let query = supabase.from('sites').select('*').eq('status', 'approved').order('view_count', { ascending: false });
      if (category) query = query.eq('category', category);
      const { data } = await query.range(off, off + lim - 1);
      return res.status(200).json({ sites: (data || []).map(publicSite) });
    }

    if (action === 'site') {
      if (!slug) return res.status(400).json({ error: 'Missing slug' });
      const { data } = await supabase.from('sites').select('*').eq('slug', slug).eq('status', 'approved').maybeSingle();
      if (!data) return res.status(404).json({ error: 'Site not found' });
      return res.status(200).json({ site: publicSite(data) });
    }

    if (action === 'search') {
      if (!q) return res.status(400).json({ error: 'Missing q' });
      const words = String(q).toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const conditions = words.map(w => `name.ilike.%${w}%,description.ilike.%${w}%,shortcut.ilike.%${w}%,category.ilike.%${w}%`).join(',');
      let query = supabase.from('sites').select('*').eq('status', 'approved');
      if (conditions) query = query.or(conditions);
      const { data } = await query.order('view_count', { ascending: false }).range(off, off + lim - 1);
      return res.status(200).json({ sites: (data || []).map(publicSite), total: (data || []).length });
    }

    if (action === 'stats') {
      const [{ count: totalSites }, { count: totalReviews }, { count: totalUsers }] = await Promise.all([
        supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('site_reviews').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);
      return res.status(200).json({ stats: { totalSites: totalSites || 0, totalReviews: totalReviews || 0, totalUsers: totalUsers || 0 } });
    }

    if (action === 'gigs') {
      let query = supabase.from('gigs').select('*').eq('status', 'active');
      if (category) query = query.eq('category', category);
      const { data } = await query.order('created_at', { ascending: false }).range(off, off + lim - 1);
      return res.status(200).json({ gigs: data || [] });
    }

    return res.status(400).json({ error: 'Unknown action. Try: sites, site, search, stats, gigs' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
