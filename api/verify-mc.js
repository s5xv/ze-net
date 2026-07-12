import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const DC_API_TOKEN = process.env.DC_TREASURY_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;

async function getTransactions(limit = 50) {
  try {
    const r = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=${limit}&page=1`, {
      headers: { "Authorization": "Bearer " + DC_API_TOKEN }
    });
    if (!r.ok) return [null, "API error: " + r.status];
    const data = await r.json();
    return [data.items || [], null];
  } catch (e) { return [null, e.message]; }
}

async function resolvePlayerUuid(mc_username) {
  try {
    const r = await fetch(`${BASE_URL}/accounts/by-player?name=${mc_username}`, {
      headers: { "Authorization": "Bearer " + DC_API_TOKEN }
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.playerUuid || null;
  } catch (e) { return null; }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, mc_username, step } = req.body;
  if (!userId || !mc_username) return res.status(400).json({ error: 'Missing data' });

  try {
    if (step === 'init') {
      // Use upsert to ensure the row exists
      await supabase.from('profiles').upsert({
        id: userId,
        mc_username: mc_username,
        mc_verified: false
      }, { onConflict: 'id' });
      return res.status(200).json({ success: true, message: 'Username registered.' });
    } 
    
    if (step === 'confirm') {
      const [txns, err] = await getTransactions(100);
      if (err) return res.status(500).json({ error: 'Treasury API error: ' + err });

      const playerUuid = await resolvePlayerUuid(mc_username);
      if (!playerUuid) return res.status(404).json({ error: `Could not find player ${mc_username}` });

      const now = new Date();
      const maxAge = 60 * 60 * 1000; 
      let found = false;

      for (const txn of txns) {
        if (txn.pluginSystem !== null && txn.pluginSystem !== undefined) continue;
        const memo = (txn.memo || txn.message || '').toLowerCase().trim();
        
        // Accept both ZEN and ZEC
        if (!memo.includes(`payment from ${mc_username.toLowerCase()} to business `) || !memo.includes(' corporate account')) continue;
        if ((txn.initiatorUuid || '').toLowerCase() !== playerUuid.toLowerCase()) continue;
        if (now - new Date(txn.settledAt) > maxAge) continue;
        if (Math.abs(parseFloat(txn.amount || 0) - 1.0) > 0.001) continue;

        found = true;
        break;
      }

      if (!found) {
        return res.status(404).json({ error: `No $1 payment from ${mc_username} found. Did you run /pay-account business ZEN 1?` });
      }

      // FIX: Use upsert here too so it definitely saves the username
      await supabase.from('profiles').upsert({ 
        id: userId,
        mc_verified: true,
        mc_username: mc_username
      }, { onConflict: 'id' });

      return res.status(200).json({ success: true, message: `${mc_username} is now linked and verified!` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
