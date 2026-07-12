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
  
  try {
    const [txns, err] = await getTransactions(50);
    if (err || !txns) {
      return res.status(200).json({ processed: 0, error: err });
    }

    console.log(`[Auto-Deposit] Processing ${txns.length} transactions`);

    const now = new Date();
    const lookback = 60 * 60 * 1000;
    let processed = 0;

    for (const t of txns) {
      try {
        const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
        let payer = "";
        
        const match1 = memo.match(/^business payment:\s*([a-zA-Z0-9_]+)\s*->/);
        if (match1) {
          payer = match1[1];
        } else {
          const match2 = memo.match(/^payment from\s+([a-zA-Z0-9_]+)\s+to business/);
          if (match2) {
            payer = match2[1];
          }
        }

        if (!payer) continue;
        if (!memo.includes('zen') && !memo.includes('zec')) continue;

        let amt = 0;
        try { amt = parseFloat(t.amount || 0); } catch (e) { continue; }
        if (amt <= 1.0) continue;

        const settled = t.settledAt;
        if (settled && now - new Date(settled) > lookback) continue;

        console.log(`[Auto-Deposit] Processing: $${amt} from ${payer}`);

        const { data: urow, error: userErr } = await supabase
          .from('profiles')
          .select('id')
          .ilike('mc_username', payer)
          .eq('mc_verified', true)
          .single();
          
        if (userErr || !urow) {
          console.log(`[Auto-Deposit] No verified profile for "${payer}"`);
          continue;
        }

        const userId = urow.id;
        const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
        if (!dc_txn_id) continue;
        const ref_id = "DC-" + dc_txn_id;

        const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
        if (existing) continue;

        const new_txn_id = genTxnId();
        
        // FIX: Only create balance row if it doesn't exist, don't reset to 0!
        const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
        
        if (!currentBal) {
          // Row doesn't exist, create it with 0
          await supabase.from('balances').insert({ user_id: userId, balance: 0 });
        }
        
        // Now fetch the actual current balance
        const { data: actualBal } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
        const newBal = (actualBal?.balance || 0) + amt;
        
        console.log(`[Auto-Deposit] Current balance: $${actualBal?.balance || 0}, adding $${amt}, new balance: $${newBal}`);
        
        await supabase.from('balances').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', userId);
        await supabase.from('transactions').insert({ 
          txn_id: new_txn_id, user_id: userId, amount: amt, type: 'deposit', ref_id, note: `Auto-detected from ${payer}` 
        });
        
        processed++;
        console.log(`[Auto-Deposit] SUCCESS: $${amt} to ${payer}`);
      } catch (txnError) {
        console.error('[Auto-Deposit] Error processing transaction:', txnError);
        continue;
      }
    }

    console.log(`[Auto-Deposit] Done. Processed: ${processed}`);
    return res.status(200).json({ processed });
    
  } catch (fatalError) {
    console.error('[Auto-Deposit] FATAL ERROR:', fatalError);
    return res.status(200).json({ processed: 0, error: fatalError.message });
  }
}
