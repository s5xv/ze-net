import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZANDENET_ACCOUNT_ID = '123945'; 

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(`${TREASURY_API_BASE}/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=20`, {
      headers: {
        'Authorization': `Bearer ${BUSINESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return res.status(500).json({ error: 'API fetch failed' });

    const rawData = await response.json();
    const transactions = rawData.items || [];

    let debugLog = [];
    let totalAdded = 0;

    for (const t of transactions) {
      const txnId = t.txnId || t.postingId;
      const amount = parseFloat(t.amount);
      const memo = (t.memo || t.message || "").trim().toLowerCase();
      const pluginSystem = t.pluginSystem;

      // 1. Skip plugin transactions
      if (pluginSystem !== null) {
        debugLog.push({ txnId, amount, status: 'SKIPPED', reason: 'pluginSystem is not null' });
        continue;
      }

      // 2. Check if already processed
      const { data: existing } = await supabase.from('processed_deposits').select('txn_id').eq('txn_id', txnId).single();
      if (existing) {
        debugLog.push({ txnId, amount, status: 'SKIPPED', reason: 'Already processed in database' });
        continue;
      }

      // 3. Extract IGN from memo
      const nameMatch = memo.match(/payment from ([a-z0-9_]+) to business zen corporate account/);
      if (!nameMatch) {
        debugLog.push({ txnId, amount, memo, status: 'SKIPPED', reason: 'Memo format does not match expected pattern' });
        continue;
      }
      
      const senderIgnRaw = nameMatch[1];
      const senderIgnFormatted = senderIgnRaw.charAt(0).toUpperCase() + senderIgnRaw.slice(1);

      // 4. Find linked user (try formatted and raw lowercase)
      let { data: linkedUser } = await supabase.from('treasury_tokens').select('user_id').eq('account_id', senderIgnFormatted).single();
      if (!linkedUser) {
        const { data: linkedUserLower } = await supabase.from('treasury_tokens').select('user_id').eq('account_id', senderIgnRaw).single();
        linkedUser = linkedUserLower;
      }

      if (!linkedUser) {
        debugLog.push({ txnId, amount, ign: senderIgnFormatted, status: 'SKIPPED', reason: 'Player is not linked to a Discord account' });
        continue;
      }

      // 5. Add to balance
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', linkedUser.user_id).single();
      const newBalance = (balData?.balance || 0) + amount;
      
      const { error: upsertError } = await supabase.from('site_balances').upsert({ 
        user_id: linkedUser.user_id, 
        balance: newBalance 
      });

      if (upsertError) {
        debugLog.push({ txnId, amount, status: 'ERROR', reason: 'Failed to update balance: ' + upsertError.message });
      } else {
        debugLog.push({ txnId, amount, ign: senderIgnFormatted, newBalance, status: 'SUCCESS', reason: 'Added to site balance' });
        totalAdded += amount;
      }

      // 6. Mark as processed
      await supabase.from('processed_deposits').insert({
        txn_id: txnId,
        amount: amount,
        user_id: linkedUser.user_id
      });
    }

    return res.status(200).json({ 
      message: `Processed ${totalAdded} total dollars`, 
      debugLog 
    });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
