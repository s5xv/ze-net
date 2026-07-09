import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZANDENET_ACCOUNT_ID = '123945'; 

async function resolvePlayerUuid(ign) {
  try {
    const res = await fetch(`${TREASURY_API_BASE}/accounts/by-player?name=${ign}`, {
      headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      return data.playerUuid || null;
    }
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
      .eq('status', 'waiting')
      .order('requested_at', { ascending: false });

    let debugLog = [];
    let totalAdded = 0;

    // Cache UUID lookups so we don't hit the API twice for the same player
    const uuidCache = {};

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
        debugLog.push({ txnId, amount, status: 'SKIPPED', reason: 'Already processed' });
        continue;
      }

      // 3. Extract IGN from memo
      const nameMatch = memo.match(/payment from ([a-z0-9_]+) to business zen corporate account/);
      if (!nameMatch) {
        debugLog.push({ txnId, amount, memo, status: 'SKIPPED', reason: 'Memo does not match pattern' });
        continue;
      }
      
      const senderIgn = nameMatch[1];

      // 4. Resolve IGN to UUID using the API (with cache)
      if (!uuidCache[senderIgn]) {
        uuidCache[senderIgn] = await resolvePlayerUuid(senderIgn);
      }
      const senderUuid = uuidCache[senderIgn];

      if (!senderUuid) {
        debugLog.push({ txnId, amount, ign: senderIgn, status: 'SKIPPED', reason: 'Could not resolve UUID for player' });
        continue;
      }

      // 5. Find linked user by UUID (this is how it was stored during linking)
      const { data: linkedUser } = await supabase
        .from('treasury_tokens')
        .select('user_id')
        .eq('account_id', senderUuid)
        .single();

      if (!linkedUser) {
        debugLog.push({ txnId, amount, ign: senderIgn, uuid: senderUuid, status: 'SKIPPED', reason: 'UUID not linked to any Discord account' });
        continue;
      }

      // 6. Add to site balance
      const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', linkedUser.user_id).single();
      const newBalance = (balData?.balance || 0) + amount;
      
      const { error: upsertError } = await supabase.from('site_balances').upsert({ 
        user_id: linkedUser.user_id, 
        balance: newBalance 
      });

      if (upsertError) {
        debugLog.push({ txnId, amount, status: 'ERROR', reason: 'Balance update failed: ' + upsertError.message });
      } else {
        debugLog.push({ txnId, amount, ign: senderIgn, newBalance, status: 'SUCCESS', reason: `Added $${amount} to balance` });
        totalAdded += amount;
      }

      // 7. Mark as processed
      await supabase.from('processed_deposits').insert({
        txn_id: txnId,
        amount: amount,
        user_id: linkedUser.user_id
      });
    }

    return res.status(200).json({ 
      message: `Processed $${totalAdded.toFixed(2)} total`, 
      debugLog 
    });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
