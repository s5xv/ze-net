import { createClient } from '@supabase/supabase-js';
import { findPaymentFrom } from './treasury.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const genTxnId = () => "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'Missing data' });

  try {
    // 1. Get user's MC username
    const { data: profile } = await supabase.from('profiles').select('mc_username, mc_verified').eq('id', userId).single();
    if (!profile?.mc_username || !profile?.mc_verified) {
      return res.status(403).json({ error: 'You must verify your MC account on the site first.' });
    }

    // 2. Find the payment in the Treasury API
    const [txn, err] = await findPaymentFrom(profile.mc_username, amount);
    if (err) return res.status(500).json({ error: err });
    if (!txn) return res.status(404).json({ error: `No payment of $${amount} found for ${profile.mc_username}. Did you wait 30 seconds after paying?` });

    // 3. Check if already deposited
    const dc_txn_id = String(txn.txnId || txn.id || txn.transactionId || "");
    const ref_id = "DC-" + dc_txn_id;

    const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').single();
    if (existing) return res.status(400).json({ error: 'Already deposited.' });

    // 4. Credit the balance
    const txn_id = genTxnId();
    await supabase.from('balances').upsert({ user_id: userId, balance: 0 });
    
    // Increment balance
    const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
    const newBal = (currentBal?.balance || 0) + parseFloat(amount);
    await supabase.from('balances').update({ balance: newBal }).eq('user_id', userId);

    // 5. Log it
    await supabase.from('transactions').insert({ 
      txn_id, user_id: userId, amount: parseFloat(amount), type: 'deposit', ref_id, 
      note: `Manual deposit trigger for ${profile.mc_username}` 
    });

    return res.status(200).json({ success: true, message: `Success! +$${amount} added. New balance: $${newBal}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
