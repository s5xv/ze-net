import { createClient } from '@supabase/supabase-js';
import { getTransactions, resolvePlayerUuid } from './treasury.js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, mcUsername } = req.body;
  if (!userId || !mcUsername) return res.status(400).json({ error: 'Missing data' });

  try {
    const playerUuid = await resolvePlayerUuid(mcUsername);
    if (!playerUuid) return res.status(404).json({ error: 'Player not found' });

    const txns = await getTransactions(100);
    const expectedMemo = `payment from ${mcUsername.toLowerCase()} to business zec corporate account`;
    
    // Look for the $1 verification payment
    const validTxn = txns.find(t => {
      if (t.pluginSystem) return false;
      const memo = (t.memo || t.message || '').toLowerCase().trim();
      if (memo !== expectedMemo) return false;
      if ((t.initiatorUuid || '').toLowerCase() !== playerUuid.toLowerCase()) return false;
      const settledAt = new Date(t.settledAt);
      if (Date.now() - settledAt > 30 * 60 * 1000) return false; // 30 min window
      return Math.abs(parseFloat(t.amount) - 1.0) < 0.01;
    });

    if (!validTxn) return res.status(404).json({ error: 'No $1 payment found' });

    // Mark as verified in Supabase
    await supabase.from('profiles').update({ 
      mc_username: mcUsername, 
      mc_verified: true 
    }).eq('id', userId);

    res.status(200).json({ success: true, message: 'Verified!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
