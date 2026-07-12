import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { withdrawalId, action } = req.body; // action: 'approve' or 'reject'
  
  try {
    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, profiles(mc_username, username)')
      .eq('id', withdrawalId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (action === 'approve') {
      // Get user's current balance
      const { data: balanceData } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_id', withdrawal.user_id)
        .single();
      
      const currentBalance = balanceData?.balance || 0;
      
      // Check if they have enough balance
      if (currentBalance < withdrawal.amount) {
        return res.status(400).json({ error: 'User has insufficient balance' });
      }
      
      // Deduct from balance
      const newBalance = currentBalance - withdrawal.amount;
      await supabase.from('balances').update({ balance: newBalance }).eq('user_id', withdrawal.user_id);
      
      // Mark as approved
      await supabase.from('withdrawal_requests').update({ 
        status: 'approved',
        note: `Paid via /pay ${withdrawal.profiles?.mc_username || 'unknown'} ${withdrawal.amount}`
      }).eq('id', withdrawalId);
      
      return res.status(200).json({ 
        success: true, 
        message: `Approved! Paid ${withdrawal.profiles?.mc_username} $${withdrawal.amount}. Balance deducted.`,
        mcUsername: withdrawal.profiles?.mc_username,
        amount: withdrawal.amount
      });
    } else if (action === 'reject') {
      // Just mark as rejected, don't touch balance
      await supabase.from('withdrawal_requests').update({ 
        status: 'rejected' 
      }).eq('id', withdrawalId);
      
      return res.status(200).json({ success: true, message: 'Withdrawal rejected' });
    }
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
