import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, reason, adminNotes } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    // Get current balance
    const { data: balData } = await supabase
      .from('site_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const newBalance = (balData?.balance || 0) + parseFloat(amount);

    // Update balance
    const { error: balError } = await supabase
      .from('site_balances')
      .upsert({ user_id: userId, balance: newBalance });

    if (balError) throw balError;

    // Log the manual deposit
    await supabase.from('manual_deposits').insert({
      user_id: userId,
      amount: parseFloat(amount),
      reason: reason || 'Manual deposit by admin',
      admin_notes: adminNotes || ''
    });

    return res.status(200).json({ 
      success: true, 
      newBalance,
      message: `Added $${amount} to user balance`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
