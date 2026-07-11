import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, amount } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    // 1. Check current balance
    const { data: balanceData } = await supabase.from('balances').select('balance').eq('user_id', userId).single();
    const currentBalance = balanceData?.balance || 0;

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 2. Deduct balance immediately
    await supabase.from('balances').update({ 
      balance: currentBalance - amount,
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);

    // 3. Create withdrawal request
    await supabase.from('withdrawal_requests').insert({
      user_id: userId,
      amount: amount,
      status: 'pending'
    });

    res.status(200).json({ success: true, message: 'Withdrawal requested' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
