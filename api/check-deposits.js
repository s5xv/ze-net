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
      .eq('status', 'waiting')
      .order('requested_at', { ascending: false });

    let actionsTaken = 0;
    let debugInfo = { 
      totalTransactions: transactions.length, 
      pendingVerifications: pendingVerifications?.length || 0, 
      lookingForIGN: ign,
      processed: []
    };

    for (const t of transactions) {
      const txnId = t.txnId || t.postingId;
      const amount = parseFloat(t.amount);
      const memo = (t.memo || t.message || "").trim().toLowerCase();
      const pluginSystem = t.pluginSystem;

      // 1. Skip internal/plugin transactions
      if (pluginSystem !== null) continue;

      // 2. Check if we already processed this transaction
      const { data: existing } = await supabase.from('processed_deposits').select('txn_id').eq('txn_id', txnId).single();
      if (existing) continue;

      // 3. Extract the sender's IGN from the memo
      // Memo format: "payment from escudos to business zen corporate account"
      const nameMatch = memo.match(/payment from ([a-z0-9_]+) to business zen corporate account/);
      if (!nameMatch) continue; 
      
      const senderIgn = nameMatch[1];

      // 4. Find if this sender is linked to a Discord account
      // We check both exact case and lowercase just in case
      const { data: linkedUser } = await supabase
        .from('treasury_tokens')
        .select('user_id')
        .or(`account_id.eq.${senderIgn},account_id.eq.${senderIgn.charAt(0).toUpperCase() + senderIgn.slice(1)}`)
        .single();

      if (!linkedUser) continue; // Sender is not linked, skip

      // 5. Check if this is a Verification Payment (Linking)
      const verificationMatch = pendingVerifications.find(v => Math.abs(parseFloat(v.expected_amount) - amount) < 0.001);

      if (verificationMatch) {
        // It's a verification payment! Link the account.
        await supabase.from('treasury_tokens').insert({
          user_id: verificationMatch.discord_user_id,
          token: 'verified_via_payment',
          account_id: senderIgn.charAt(0).toUpperCase() + senderIgn.slice(1) // Store with proper casing
        });
        await supabase.from('pending_verifications').update({ status: 'verified' }).eq('id', verificationMatch.id);
        debugInfo.processed.push(`Linked account for ${senderIgn}`);
        actionsTaken++;
      } else {
        // It's a standard deposit! Add money to their site balance.
        const { data: balData } = await supabase
          .from('site_balances')
          .select('balance')
          .eq('user_id', linkedUser.user_id)
          .single();

        const newBalance = (balData?.balance || 0) + amount;
        
        await supabase.from('site_balances').upsert({ 
          user_id: linkedUser.user_id, 
          balance: newBalance 
        });
        
        debugInfo.processed.push(`Added $${amount} to ${senderIgn}'s balance`);
        actionsTaken++;
      }

      // 6. Mark transaction as processed so it's never counted twice
      await supabase.from('processed_deposits').insert({
        txn_id: txnId,
        amount: amount,
        user_id: linkedUser.user_id
      });
    }

    return res.status(200).json({ message: `Processed ${actionsTaken} actions`, debug: debugInfo });

  } catch (error) {
    console.error('Deposit check error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
