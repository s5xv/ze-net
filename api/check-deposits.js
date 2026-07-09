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
    // 1. Fetch recent transactions from the business account
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
    const transactions = Array.isArray(rawData) ? rawData : (rawData.data || []);

    // 2. Get all pending verification requests from the database
    const { data: pendingVerifications } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('status', 'waiting');

    let actionsTaken = 0;

    // 3. Loop through transactions to find matches
    for (const txn of transactions) {
      const txnId = txn.txnId || txn.id || txn.postingId;
      const amount = parseFloat(txn.amount);
      const initiatorUuid = txn.initiatorUuid || txn.initiator || txn.senderUuid || txn.sender;

      if (!txnId || amount <= 0 || !initiatorUuid) continue;

      // Check if this transaction matches any pending verification amount
      const match = pendingVerifications.find(v => Math.abs(v.expected_amount - amount) < 0.001);

      if (match) {
        // Check if this UUID is already linked to someone
        const { data: alreadyLinked } = await supabase.from('treasury_tokens').select('id').eq('account_id', initiatorUuid).single();
        
        if (!alreadyLinked) {
          // Link the account!
          await supabase.from('treasury_tokens').insert({
            user_id: match.discord_user_id,
            token: 'verified_via_payment',
            account_id: initiatorUuid
          });
          
          await supabase.from('pending_verifications').update({ status: 'verified' }).eq('id', match.id);
          actionsTaken++;
        }
      }
    }

    return res.status(200).json({ message: `Processed ${actionsTaken} verifications` });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
