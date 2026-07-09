import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZANDENET_ACCOUNT_ID = '123945'; 
const BUSINESS_NAME = 'zen'; 

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ign = req.query.ign; 

  try {
    const response = await fetch(`${TREASURY_API_BASE}/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=100`, {
      headers: {
        'Authorization': `Bearer ${BUSINESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return res.status(500).json({ error: 'API fetch failed' });

    const rawData = await response.json();
    const transactions = rawData.items || [];

    const { data: pendingVerifications } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('status', 'waiting');

    let actionsTaken = 0;
    let skippedTransactions = [];
    let debugInfo = { 
      totalTransactions: transactions.length, 
      pendingVerifications: pendingVerifications?.length || 0, 
      lookingForIGN: ign,
      expectedAmounts: pendingVerifications ? pendingVerifications.map(v => v.expected_amount) : []
    };

    for (const t of transactions) {
      const txnId = t.txnId || t.postingId;
      const amount = parseFloat(t.amount);
      const memo = (t.memo || t.message || "").trim().toLowerCase();
      const pluginSystem = t.pluginSystem;

      let skipReason = null;

      // Check 1: Plugin System
      if (pluginSystem !== null) {
        skipReason = `Skipped because pluginSystem is "${pluginSystem}" (must be null)`;
      } 
      // Check 2: Amount Match
      else {
        const amountMatch = pendingVerifications.find(v => Math.abs(parseFloat(v.expected_amount) - amount) < 0.001);
        if (!amountMatch) {
          skipReason = `Amount ${amount} does not match any pending verification. (Looking for: ${debugInfo.expectedAmounts.join(', ')})`;
        } 
        // Check 3: Memo Match
        else {
          const expectedMemo = `payment from ${ign.toLowerCase()} to business ${BUSINESS_NAME} corporate account`;
          if (memo !== expectedMemo) {
            skipReason = `Memo mismatch!\nActual:   "${memo}"\nExpected: "${expectedMemo}"`;
          }
        }
      }

      if (skipReason) {
        skippedTransactions.push({ txnId, amount, memo, reason: skipReason });
        continue;
      }

      // If we get here, it's a match!
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

      await supabase.from('treasury_tokens').insert({
        user_id: amountMatch.discord_user_id,
        token: 'verified_via_payment',
        account_id: playerUuid || ign 
      });

      await supabase.from('pending_verifications').update({ status: 'verified' }).eq('id', amountMatch.id);
      actionsTaken++;
    }

    debugInfo.skippedTransactions = skippedTransactions;

    return res.status(200).json({ message: `Processed ${actionsTaken} verifications`, debug: debugInfo });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
