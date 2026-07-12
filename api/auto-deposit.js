import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const DC_API_TOKEN = process.env.DC_TREASURY_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(`[Auto-Deposit] Starting with DC_API_TOKEN: ${DC_API_TOKEN ? 'SET' : 'MISSING'}`);
console.log(`[Auto-Deposit] ZEC_ACCOUNT_ID: ${ZEC_ACCOUNT_ID}`);

async function getTransactions(limit = 50) {
  try {
    console.log(`[Auto-Deposit] Fetching transactions from ${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions`);
    const r = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=${limit}&page=1`, {
      headers: { "Authorization": "Bearer " + DC_API_TOKEN }
    });
    console.log(`[Auto-Deposit] API response status: ${r.status}`);
    if (!r.ok) return [null, "API error: " + r.status];
    const data = await r.json();
    console.log(`[Auto-Deposit] Received ${data.items?.length || 0} transactions`);
    return [data.items || [], null];
  } catch (e) { 
    console.error('[Auto-Deposit] Fetch error:', e);
    return [null, e.message]; 
  }
}

const genTxnId = () => "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  console.log('[Auto-Deposit] Handler started');
  
  const [txns, err] = await getTransactions(50);
  if (err || !txns) {
    console.error('[Auto-Deposit] Failed to get transactions:', err);
    return res.status(200).json({ processed: 0, error: err });
  }

  console.log(`[Auto-Deposit] Processing ${txns.length} transactions`);

  const now = new Date();
  const lookback = 60 * 60 * 1000;
  let processed = 0;

  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];
    const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
    
    console.log(`[Auto-Deposit] Transaction ${i}: memo="${memo}", amount=${t.amount}, settledAt=${t.settledAt}`);
    
    let payer = "";
    
    if (memo.startsWith('business payment:')) {
      try {
        const afterColon = memo.split('business payment:', 1)[1].trim();
        payer = afterColon.split('->')[0].trim();
        console.log(`[Auto-Deposit] Format 1 matched, payer="${payer}"`);
      } catch (e) { 
        console.log('[Auto-Deposit] Format 1 parse error:', e);
        continue; 
      }
    }
    else if (memo.startsWith('payment from')) {
      try {
        const afterFrom = memo.split('payment from', 1)[1].trim();
        payer = afterFrom.split(' to ')[0].trim();
        console.log(`[Auto-Deposit] Format 2 matched, payer="${payer}"`);
      } catch (e) { 
        console.log('[Auto-Deposit] Format 2 parse error:', e);
        continue; 
      }
    }
    else {
      console.log('[Auto-Deposit] No format matched, skipping');
      continue;
    }

    if (!payer) {
      console.log('[Auto-Deposit] No payer extracted, skipping');
      continue;
    }

    if (!memo.includes('zen') && !memo.includes('zec')) {
      console.log('[Auto-Deposit] Not to ZEN/ZEC business, skipping');
      continue;
    }

    let amt = 0;
    try { amt = parseFloat(t.amount || 0); } catch (e) { continue; }
    if (amt <= 1.0) {
      console.log(`[Auto-Deposit] Skipping $${amt} verify payment`);
      continue; 
    }

    const settled = t.settledAt;
    if (settled && now - new Date(settled) > lookback) {
      console.log('[Auto-Deposit] Transaction too old, skipping');
      continue;
    }

    console.log(`[Auto-Deposit] Found potential deposit: $${amt} from ${payer}`);

    const { data: urow, error: userErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('mc_username', payer)
      .eq('mc_verified', true)
      .single();
      
    if (userErr || !urow) {
      console.log(`[Auto-Deposit] No verified profile for "${payer}":`, userErr?.message);
      continue;
    }

    const userId = urow.id;
    const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
    if (!dc_txn_id) continue;
    const ref_id = "DC-" + dc_txn_id;

    const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
    if (existing) {
      console.log(`[Auto-Deposit] Already deposited ref_id ${ref_id}`);
      continue;
    }

    const new_txn_id = genTxnId();
    
    const { error: balErr } = await supabase.from('balances').upsert({ user_id: userId, balance: 0 }, { onConflict: 'user_id' });
    if (balErr) console.error('[Auto-Deposit] Balance upsert error:', balErr);

    const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
    const newBal = (currentBal?.balance || 0) + amt;
    
    const { error: updateErr } = await supabase.from('balances').update({ balance: newBal }).eq('user_id', userId);
    if (updateErr) console.error('[Auto-Deposit] Balance update error:', updateErr);

    const { error: txnErr } = await supabase.from('transactions').insert({ 
      txn_id: new_txn_id, user_id: userId, amount: amt, type: 'deposit', ref_id, note: `Auto-detected DC deposit from ${payer}` 
    });
    if (txnErr) console.error('[Auto-Deposit] Transaction insert error:', txnErr);
    
    processed++;
    console.log(`[Auto-Deposit] SUCCESS: Credited $${amt} to ${userId} (${payer})`);
  }

  console.log(`[Auto-Deposit] Finished. Processed ${processed} deposits`);
  return res.status(200).json({ processed });
}
