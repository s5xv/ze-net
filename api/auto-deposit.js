import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const DC_API_TOKEN = process.env.DC_TREASURY_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getTransactions(limit = 50) {
  try {
    const r = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=${limit}&page=1`, {
      headers: { "Authorization": "Bearer " + DC_API_TOKEN }
    });
    if (!r.ok) return [null, "API error: " + r.status];
    const data = await r.json();
    return [data.items || [], null];
  } catch (e) { 
    return [null, e.message]; 
  }
}

const genTxnId = () => "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  const [txns, err] = await getTransactions(50);
  if (err || !txns) {
    return res.status(200).json({ processed: 0, error: err });
  }

  console.log(`[Auto-Deposit] Processing ${txns.length} transactions`);

  const now = new Date();
  const lookback = 60 * 60 * 1000; // 1 hour
  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < txns.length; i++) {
    try {
      const t = txns[i];
      const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
      
      // Log first 3 transactions to see the format
      if (i < 3) {
        console.log(`[Auto-Deposit] Sample txn ${i}:`, {
          memo: memo.substring(0, 100),
          amount: t.amount,
          settledAt: t.settledAt,
          age: t.settledAt ? `${Math.floor((now - new Date(t.settledAt)) / 1000 / 60)} minutes ago` : 'unknown'
        });
      }
      
      let payer = "";
      
      if (memo.startsWith('business payment:')) {
        const afterColon = memo.split('business payment:', 1)[1].trim();
        payer = afterColon.split('->')[0].trim();
      }
      else if (memo.startsWith('payment from')) {
        const afterFrom = memo.split('payment from', 1)[1].trim();
        payer = afterFrom.split(' to ')[0].trim();
      }
      else {
        skipped++;
        continue;
      }

      if (!payer || (!memo.includes('zen') && !memo.includes('zec'))) {
        skipped++;
        continue;
      }

      let amt = 0;
      try { amt = parseFloat(t.amount || 0); } catch (e) { continue; }
      
      if (amt <= 1.0) {
        console.log(`[Auto-Deposit] Skipping $${amt} (verify payment)`);
        skipped++;
        continue; 
      }

      // Check time - but log if we're skipping due to age
      const settled = t.settledAt;
      if (settled) {
        const age = now - new Date(settled);
        if (age > lookback) {
          console.log(`[Auto-Deposit] Skipping $${amt} from ${payer} - too old (${Math.floor(age / 1000 / 60)} min)`);
          skipped++;
          continue;
        }
      }

      console.log(`[Auto-Deposit] Processing: $${amt} from ${payer}`);

      const { data: urow, error: userErr } = await supabase
        .from('profiles')
        .select('id')
        .ilike('mc_username', payer)
        .eq('mc_verified', true)
        .single();
        
      if (userErr || !urow) {
        console.log(`[Auto-Deposit] No verified profile for "${payer}"`);
        skipped++;
        continue;
      }

      const userId = urow.id;
      const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
      if (!dc_txn_id) {
        skipped++;
        continue;
      }
      const ref_id = "DC-" + dc_txn_id;

      const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
      if (existing) {
        console.log(`[Auto-Deposit] Already deposited ${ref_id}`);
        skipped++;
        continue;
      }

      const new_txn_id = genTxnId();
      
      await supabase.from('balances').upsert({ user_id: userId, balance: 0 }, { onConflict: 'user_id' });
      const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
      const newBal = (currentBal?.balance || 0) + amt;
      
      await supabase.from('balances').update({ balance: newBal }).eq('user_id', userId);
      await supabase.from('transactions').insert({ 
        txn_id: new_txn_id, user_id: userId, amount: amt, type: 'deposit', ref_id, note: `Auto-detected from ${payer}` 
      });
      
      processed++;
      console.log(`[Auto-Deposit] SUCCESS: $${amt} to ${payer}`);
    } catch (e) {
      console.error(`[Auto-Deposit] Error processing txn ${i}:`, e);
    }
  }

  console.log(`[Auto-Deposit] Done. Processed: ${processed}, Skipped: ${skipped}`);
  return res.status(200).json({ processed, skipped });
}
