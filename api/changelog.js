import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1527804037674569879/v772W_-v4uiw7SurYxaB0-fomKDSPHkRg8sbhlFf7jJoZvFBEp0cNl7bQk9Id5pFm7sb';
const ROLE_ID = '1527803322197741740';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = req.headers.authorization;
  const pw = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== pw) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content required' });
  }

  const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { data, error } = await supabase
    .from('changelog')
    .insert({ content: content.trim(), date_label: date })
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  const discordBody = {
    content: `**Z&E Net Update — ${date}**\n\n${content.trim()}\n\n<@&${ROLE_ID}>`,
    allowed_mentions: { parse: [], roles: [ROLE_ID] },
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordBody),
    });
  } catch (e) {
    console.error('Discord webhook failed:', e);
  }

  return res.status(200).json({ ok: true, id: data?.id });
}
