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

  const ign = req.query.ign; // Get the in-game name from the query parameter

  try {
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
    const transactions = rawData.items || [];

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

    for (const txn of transactions) {
      const txnId = txn.txnId || txn.postingId;
      const amount = parseFloat(txn.amount);
      const memo = txn.memo || '';

      if (!txnId || isNaN(amount) || amount <= 0) continue;

      const { data: existing } = await supabase
        .from('processed_deposits')
        .select('txn_id')
        .eq('txn_id', txnId)
        .single();

      if (existing) continue;

      // Check if this transaction matches a pending verification by amount
      const amountMatch = pendingVerifications.find(v => {
        const expectedAmount = parseFloat(v.expected_amount);
        return Math.abs(expectedAmount - amount) < 0.001;
      });

      if (amountMatch && ign) {
        // Check if the memo contains the player's IGN
        // The memo format is: "Payment from <IGN> to business ZEN Corporate Account"
        const memoLower = memo.toLowerCase();
        const ignLower = ign.toLowerCase();
        
        if (memoLower.includes(ignLower)) {
          debugInfo.matchedTransactions.push({
            txnId,
            amount,
            memo,
            matchedIGN: ign
          });

          // We found a match! Now we need to get the actual UUID
          // Since we can't get it from the API, we'll store the IGN instead
          await supabase.from('treasury_tokens').insert({
            user_id: amountMatch.discord_user_id,
            token: 'verified_via_payment',
            account_id: ign // Store the IGN instead of UUID
          });
          
          await supabase.from('pending_verifications')
            .update({ status: 'verified' })
            .eq('id', amountMatch.id);
          
          actionsTaken++;
        }
      }

      await supabase.from('processed_deposits').insert({
        txn_id: txnId,
        amount: amount,
        user_id: null
      });
    }

    return res.status(200).json({ 
      message: `Processed ${actionsTaken} verifications`,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
