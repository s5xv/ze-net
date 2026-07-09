import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
const ZANDENET_ACCOUNT_ID = '123945'; 

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Fetch recent transactions
    const response = await fetch(`${TREASURY_API_BASE}/api/v1/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=50`, {
      headers: {
        'Authorization': `Bearer ${BUSINESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: `API fetch failed with status ${response.status}` });
    }

    const rawData = await response.json();
    
    // FIX: The API returns transactions under "items", not "data"
    const transactions = rawData.items || [];

    // 2. Get all pending verification requests
    const { data: pendingVerifications } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('status', 'waiting');

    let actionsTaken = 0;

    // 3. Loop through transactions
    for (const txn of transactions) {
      const txnId = txn.txnId || txn.postingId;
      // FIX: amount is a string in the API, so we parse it
      const amount = parseFloat(txn.amount);
      const initiatorUuid = txn.initiatorUuid;

      if (!txnId || isNaN(amount) || amount <= 0 || !initiatorUuid) continue;

      // Check if we already processed this transaction
      const { data: existing } = await supabase
        .from('processed_deposits')
        .select('txn_id')
        .eq('txn_id', txnId)
        .single();

      if (existing) continue;

      // 4. Find a matching pending verification by amount
      const match = pendingVerifications.find(v => {
        const expectedAmount = parseFloat(v.expected_amount);
        return Math.abs(expectedAmount - amount) < 0.001;
      });

      if (match) {
        // Check if this UUID is already linked
        const { data: alreadyLinked } = await supabase
          .from('treasury_tokens')
          .select('id')
          .eq('account_id', initiatorUuid)
          .single();
        
        if (!alreadyLinked) {
          // Link the account!
          await supabase.from('treasury_tokens').insert({
            user_id: match.discord_user_id,
            token: 'verified_via_payment',
            account_id: initiatorUuid
          });
          
          await supabase.from('pending_verifications')
            .update({ status: 'verified' })
            .eq('id', match.id);
          
          actionsTaken++;
        }
      }

      // Mark transaction as processed
      await supabase.from('processed_deposits').insert({
        txn_id: txnId,
        amount: amount,
        user_id: null
      });
    }

    return res.status(200).json({ 
      message: `Processed ${actionsTaken} verifications`,
      debug: {
        totalTransactions: transactions.length,
        pendingVerifications: pendingVerifications?.length || 0
      }
    });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
