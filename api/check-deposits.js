import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID || '123945';

async function resolvePlayerUuid(ign) {
  try {
    const res = await fetch(`${TREASURY_API_BASE}/accounts/by-player?name=${ign}`, {
      headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      return data.playerUuid || null;
    }
  } catch (e) {
    console.error('Failed to resolve player UUID:', e);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mc_username, amount } = req.body;

  if (!mc_username || !amount) {
    return res.status(400).json({ error: 'Missing mc_username or amount' });
  }

  try {
    // Get recent transactions
    const txRes = await fetch(
      `${TREASURY_API_BASE}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=100`,
      {
        headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
      }
    );

    if (!txRes.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const txData = await txRes.json();
    const transactions = txData.items || [];

    // Resolve player UUID
    const playerUuid = await resolvePlayerUuid(mc_username);
    if (!playerUuid) {
      return res.status(404).json({ error: `Could not find player ${mc_username}` });
    }

    const expectedMemo = `payment from ${mc_username.toLowerCase()} to business zec corporate account`;
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Find matching transaction
    for (const txn of transactions) {
      // Skip plugin transactions
      if (txn.pluginSystem !== null && txn.pluginSystem !== undefined) {
        continue;
      }

      const memo = (txn.memo || txn.message || '').toLowerCase().trim();
      if (memo !== expectedMemo) {
        continue;
      }

      const initiator = (txn.initiatorUuid || '').toLowerCase();
      if (initiator !== playerUuid.toLowerCase()) {
        continue;
      }

      const settledAt = new Date(txn.settledAt);
      if (now - settledAt > maxAge) {
        continue;
      }

      const txnAmount = parseFloat(txn.amount || 0);
      if (Math.abs(txnAmount - parseFloat(amount)) > 0.001) {
        continue;
      }

      // Found valid transaction
      return res.status(200).json({
        success: true,
        transaction: txn,
        amount: txnAmount
      });
    }

    // No matching transaction found
    return res.status(404).json({
      success: false,
      error: `No payment of $${amount} from ${mc_username} found`
    });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
