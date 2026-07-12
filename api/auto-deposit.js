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
  } catch (e) { return [null, e.message]; }
}

const genTxnId = () => "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const [txns, err] = await getTransactions(50);
  if (err || !txns) return res.status(200).json({ processed: 0, error: err });

  const now = new Date();
  const lookback = 60 * 60 * 1000; // 1 hour
  let processed = 0;

  for (const t of txns) {
    const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
    
    // FIX: Parse the actual format: "business payment: escudos -> zen"
    if (!memo.startsWith('business payment:')) {
      console.log('[Auto-Deposit] Skipping non-business payment:', memo);
      continue;
    }

    // Extract username and business name
    let payer = "";
    let businessName = "";
    try {
      const afterColon = memo.split('business payment:', 1)[1].trim();
      const parts = afterColon.split('->').map(p => p.trim());
      payer = parts[0];
      businessName = parts[1];
    } catch (e) { 
      console.log('[Auto-Deposit] Failed to parse memo:', memo);
      continue; 
    }

    // Verify it's to our business (ZEN or ZEC)
    if (!businessName.includes('zen') && !businessName.includes('zec')) {
      console.log('[Auto-Deposit] Skipping payment to different business:', businessName);
      continue;
    }

    let amt = 0;
    try { amt = parseFloat(t.amount || 0); } catch (e) { continue; }
    if (amt <= 1.0) {
      console.log('[Auto-Deposit] Skipping $1 verify payment:', amt);
      continue; 
    }

    const settled = t.settledAt;
    if (settled && now - new Date(settled) > lookback) continue;

    console.log(`[Auto-Deposit] Found potential deposit: $${amt} from ${payer} to ${businessName}`);

    // Check if user is verified
    const { data: urow, error: userErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('mc_username', payer)
      .eq('mc_verified', true)
      .single();
      
    if (userErr || !urow) {
      console.log(`[Auto-Deposit] SKIPPED: No verified profile found for "${payer}". Error:`, userErr?.message);
      continue;
    }

    const userId = urow.id;
    const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
    if (!dc_txn_id) continue;
    const ref_id = "DC-" + dc_txn_id;

    // Idempotency check
    const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
    if (existing) {
      console.log(`[Auto-Deposit] SKIPPED: Already deposited ref_id ${ref_id}`);
      continue;
    }

    const new_txn_id = genTxnId();
    
    // Save to database
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

  return res.status(200).json({ processed });
}
