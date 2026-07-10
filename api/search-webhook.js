import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, userId } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const webhookUrl = process.env.DISCORD_SEARCH_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(200).json({ success: true, message: 'Webhook URL not configured' });
    }

    const embed = {
      title: '🔍 New Search',
      description: `**Query:** ${query}`,
      color: 0x10b981,
      timestamp: new Date().toISOString(),
      footer: { text: `User: ${userId?.slice(0, 8) || 'Anonymous'}` }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error('Failed to send webhook');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Search webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
