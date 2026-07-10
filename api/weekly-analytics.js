import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total searches this week
    const { data: searches } = await supabase
      .from('search_analytics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get total site views this week
    const { data: sites } = await supabase.from('sites').select('view_count, click_count');
    const totalViews = sites?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
    const totalClicks = sites?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0;

    // Get total registered businesses
    const { count: businessCount } = await supabase
      .from('business_registrations')
      .select('*', { count: 'exact', head: true });

    // Get total active ads
    const { count: adCount } = await supabase
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const webhookUrl = process.env.DISCORD_ANALYTICS_WEBHOOK_URL || 'https://discord.com/api/webhooks/1524730079484055672';

    const embed = {
      title: '📊 Z&E Net Weekly Analytics',
      color: 0x3b82f6,
      timestamp: new Date().toISOString(),
      fields: [
        { name: '🔍 Total Searches', value: `${searches?.length || 0}`, inline: true },
        { name: '️ Total Site Views', value: `${totalViews}`, inline: true },
        { name: '️ Total Clicks', value: `${totalClicks}`, inline: true },
        { name: '🏢 Registered Businesses', value: `${businessCount || 0}`, inline: true },
        { name: '📢 Active Ads', value: `${adCount || 0}`, inline: true },
        { name: '📈 Period', value: 'Last 7 days', inline: true }
      ],
      footer: { text: 'Z&E Net Analytics Bot' }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error('Failed to send webhook');
    }

    return res.status(200).json({ success: true, message: 'Analytics sent to Discord' });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    return res.status(500).json({ error: error.message });
  }
}
