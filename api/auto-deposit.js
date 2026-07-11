import { createClient } from '@supabase/supabase-js';
import { getTransactions } from './treasury.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genTxnId = () => "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const [txns, err] = await getTransactions(50);
  if (err || !txns) return res.status(200).json({ processed: 0, error: err });

  const now = new Date();
  const lookback = 60 * 60 * 1000; // 1 hour lookback
  let processed = 0;

  for (const t of txns) {
    if (t.pluginSystem !== null && t.pluginSystem !== undefined) continue;
    
    const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
    if (!memo.includes("payment from") || !memo.includes("corporate account")) continue;

    let amt = 0;
    try { amt = parseFloat(t.amount || 0); } catch (e) { continue; }
    if (amt <= 1.0) continue; // Skip $1 verify payments

    const settled = t.settledAt;
    if (settled) {
      const settled_dt = new Date(settled);
      if (now - settled_dt > lookback) continue;
    }

    // FIX: Extract username regardless of whether it's ZEN or ZEC
    let payer = "";
    try {
      const after_from = memo.split("payment from ", 1)[1];
      payer = after_from.split(" to business ", 1)[0].trim();
    } catch (e) { continue; }

    const { data: urow } = await supabase.from('users').select('user_id').ilike('mc_username', payer).eq('mc_verified', true).single();
    if (!urow) continue;

    const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
    if (!dc_txn_id) continue;
    const ref_id = "DC-" + dc_txn_id;

    const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
    if (existing) continue;

    const new_txn_id = genTxnId();
    
    await supabase.from('balances').upsert({ user_id: urow.user_id, balance: 0 });
    
    // Increment balance safely
    const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', urow.user_id).single();
    const newBal = (currentBal?.balance || 0) + amt;
    await supabase.from('balances').update({ balance: newBal }).eq('user_id', urow.user_id);

    await supabase.from('transactions').insert({ txn_id: new_txn_id, user_id: urow.user_id, amount: amt, type: 'deposit', ref_id, note: `Auto-detected DC deposit from ${payer}` });
    
    processed++;
  }

  return res.status(200).json({ processed });
}
