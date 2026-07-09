import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZANDENET_ACCOUNT_ID = '123945'; 
const BUSINESS_NAME = 'zen'; // Must be lowercase for memo matching

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ign = req.query.ign; 

  try {
    // 1. Fetch transactions (limit 100 like your Python script)
    const response = await fetch(`${TREASURY_API_BASE}/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=100`, {
      headers: {
        'Authorization': `Bearer ${BUSINESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return res.status(500).json({ error: 'API fetch failed' });

    const rawData = await response.json();
    const transactions = rawData.items || [];

    // 2. Get pending verifications
    const { data: pendingVerifications } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('status', 'waiting');

    let actionsTaken = 0;
    let debugInfo = { 
      totalTransactions: transactions.length, 
      pendingVerifications: pendingVerifications?.length || 0, 
      lookingForIGN: ign, 
      matchedTransactions: [] 
    };

    // 3. Mimic the Python script's exact matching logic
    for (const t of transactions) {
      // Skip plugin system transactions (like internal business transfers)
      if (t.pluginSystem !== null) continue;

      const txnId = t.txnId || t.postingId;
      const amount = parseFloat(t.amount);
      
      // Check amount against pending verifications
      const match = pendingVerifications.find(v => Math.abs(parseFloat(v.expected_amount) - amount) < 0.001);
      if (!match) continue;

      // Check memo EXACTLY like the Python script
      // Python: expected_memo = f"payment from {mc_username.lower()} to business zec corporate account"
      const memo = (t.memo || t.message || "").trim().toLowerCase();
      const expectedMemo = `payment from ${ign.toLowerCase()} to business ${BUSINESS_NAME} corporate account`;

      if (memo === expectedMemo) {
         debugInfo.matchedTransactions.push({ txnId, amount, memo });

         // Try to fetch the player's UUID using the /accounts/by-player endpoint
         let playerUuid = null;
         try {
           const playerRes = await fetch(`${TREASURY_API_BASE}/accounts/by-player?name=${ign}`, {
             headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
           });
           if (playerRes.ok) {
             const playerData = await playerRes.json();
             playerUuid = playerData.playerUuid;
           }
         } catch (e) { /* ignore */ }

         // Link the account!
         await supabase.from('treasury_tokens').insert({
           user_id: match.discord_user_id,
           token: 'verified_via_payment',
           account_id: playerUuid || ign 
         });

         await supabase.from('pending_verifications').update({ status: 'verified' }).eq('id', match.id);
         actionsTaken++;
      }
    }

    return res.status(200).json({ message: `Processed ${actionsTaken} verifications`, debug: debugInfo });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
