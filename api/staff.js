import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action, userId, details, roleName, amount } = req.body;
  if (!action || !userId) return res.status(400).json({ error: 'Missing data' });

  try {
    // 1. Log the action
    await supabase.from('staff_logs').insert({
      user_id: userId,
      role_name: roleName || 'Unknown',
      action,
      details
    });

    // 2. Calculate Commission based on your rules
    let commission = 0;
    
    if (action === 'approve_ad' && amount) {
      // Ad Manager gets 10% of the ad price
      commission = parseFloat(amount) * 0.10;
    } else if (action === 'verify_site') {
      // Trust & Safety gets 10% of the $100 verification fee
      commission = 100 * 0.10; // $10
    } else if (action === 'review_site') {
      // Trust & Safety gets $50 flat for reviewing a site
      commission = 50;
    }

    // 3. Upsert payroll record for this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    // Get current week's stats
    const { data: currentPayroll } = await supabase
      .from('staff_payroll')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', startOfWeek.toISOString().split('T')[0])
      .single();

    const currentActions = currentPayroll?.actions_count || 0;
    const currentBonus = currentPayroll?.bonus_pay || 0;
    const basePay = currentPayroll?.base_pay || 0; // Base pay is set when role is assigned

    await supabase.from('staff_payroll').upsert({
      user_id: userId,
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      actions_count: currentActions + 1,
      base_pay: basePay,
      bonus_pay: currentBonus + commission,
      total_due: basePay + currentBonus + commission,
      status: 'pending'
    }, { onConflict: 'user_id, week_start' });

    res.status(200).json({ success: true, message: `Action logged. Commission earned: $${commission.toFixed(2)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
