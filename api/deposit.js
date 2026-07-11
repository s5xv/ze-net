import { createClient } from '@supabase/supabase-js';
import { getTransactions, resolvePlayerUuid } from './treasury.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, mcUsername, amount } = req.body;
  if (!userId || !mcUsername || !amount) return res.status(400).json({ error: 'Missing data' });

  try {
    // Check if user is verified
    const { data: profile } = await supabase.from('profiles').select('mc_verified').eq('id', userId).single();
    if (!profile?.mc_verified) return res.status(403).json({ error: 'MC account not verified' });

    const playerUuid = await resolvePlayerUuid(mcUsername);
    const txns = await getTransactions(100);
    const expectedMemo = `payment from ${mcUsername.toLowerCase()} to business zec corporate account`;
    
    const validTxn = txns.find(t => {
      if (t.pluginSystem) return false;
      const memo = (t.memo || t.message || '').toLowerCase().trim();
      if (memo !== expectedMemo) return false;
      if ((t.initiatorUuid || '').toLowerCase() !== playerUuid.toLowerCase()) return false;
      const settledAt = new Date(t.settledAt);
      if (Date.now() - settledAt > 30 * 60 * 1000) return false;
      return Math.abs(parseFloat(t.amount) - parseFloat(amount)) < 0.01;
    });

    if (!validTxn) return res.status(404).json({ error: 'Payment not found' });

    // Check if already deposited (idempotency)
    const refId = `DC-${validTxn.txnId}`;
    const { data: existing } = await supabase.from('transactions').select('id').eq('ref_id', refId).single();
    if (existing) return res.status(400).json({ error: 'Already deposited' });

    // Credit the balance
    await supabase.rpc('increment_balance', { user_id: userId, amount: parseFloat(amount) });
    
    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: parseFloat(amount),
      type: 'deposit',
      ref_id: refId,
      note: `MC deposit from ${mcUsername}`
    });

    res.status(200).json({ success: true, message: `Deposited $${amount}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
