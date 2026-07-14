import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const DC_API_TOKEN = process.env.DC_TREASURY_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;


const _headers = () => ({ "Authorization": "Bearer " + DC_API_TOKEN });

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.split(' ')[1]);
  if (error || !user) return null;
  return user;
};

const requireUser = async (req) => {
  const user = await getUser(req);
  if (!user) throw new Error('Authentication required');
  return user;
};

const requireAdmin = async (req) => {
  const user = await getUser(req);
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('is_staff').eq('id', user.id).maybeSingle();
  return data?.is_staff === true;
};

async function getTransactions(limit = 100) {
  if (!DC_API_TOKEN || !ZEC_ACCOUNT_ID) return [null, "Config missing"];
  try {
    const r = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=${limit}&page=1`, { headers: _headers() });
    if (!r.ok) return [null, "API error: " + r.status];
    const data = await r.json();
    return [data.items || [], null];
  } catch (e) { return [null, e.message]; }
}

async function resolvePlayerUuid(mc_username) {
  if (!DC_API_TOKEN) return null;
  try {
    const r = await fetch(`${BASE_URL}/accounts/by-player?name=${mc_username}`, { headers: _headers() });
    if (!r.ok) return null;
    const data = await r.json();
    return data.playerUuid || null;
  } catch { return null; }
}

async function getBalance() {
  if (!DC_API_TOKEN || !ZEC_ACCOUNT_ID) return [null, "Config missing"];
  try {
    const r = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/balance`, { headers: _headers() });
    if (!r.ok) return [null, "API error"];
    const data = await r.json();
    return [data.balance, null];
  } catch (e) { return [null, e.message]; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const [balance, err] = await getBalance();
    if (err) return res.status(500).json({ error: err });
    return res.status(200).json({ balance });
  }

  try {
    const user = await requireUser(req);
    const userId = user.id;
    const { action, mc_username, mcUsername, step, details, roleName, amount, withdrawalId, refId, userName, secretCode } = req.body;
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // --- verify-mc ---
    if (action === 'verify-mc') {
      if (step === 'init') {
        const { error } = await supabase.rpc('link_mc_account', { target_user_id: userId, mc_username, verified: false, initiated_at: new Date().toISOString() });
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Username registered.' });
      }
      if (step === 'confirm') {
        const [txns, err] = await getTransactions(100);
        if (err) return res.status(500).json({ error: 'Treasury API error: ' + err });
        const playerUuid = await resolvePlayerUuid(mc_username);
        if (!playerUuid) return res.status(404).json({ error: `Could not find player ${mc_username}` });
        const { data: profile } = await supabase.from('profiles').select('mc_verify_initiated_at').eq('id', userId).maybeSingle();
        const initiatedAt = profile?.mc_verify_initiated_at ? new Date(profile.mc_verify_initiated_at).getTime() : 0;
        let found = null;
        for (const txn of txns) {
          const settledAt = new Date(txn.settledAt).getTime();
          if (settledAt < initiatedAt) continue;
          const memo = (txn.memo || txn.message || '').toLowerCase().trim();
          let payer = "";
          const match1 = memo.match(/^business payment:\s*([a-zA-Z0-9_]+)\s*->/);
          if (match1) payer = match1[1];
          else { const match2 = memo.match(/^payment from\s+([a-zA-Z0-9_]+)\s+to business/); if (match2) payer = match2[1]; }
          if (payer !== mc_username.toLowerCase() || !memo.includes('zen') && !memo.includes('zec')) continue;
          if ((txn.initiatorUuid || '').toLowerCase() !== playerUuid.toLowerCase()) continue;
          if (Math.abs(parseFloat(txn.amount || 0) - 1.0) > 0.001) continue;
          found = txn;
          break;
        }
        if (!found) return res.status(404).json({ error: `No $1 payment from ${mc_username} found. Run /pay-account business ZEN 1.` });
        await supabase.rpc('link_mc_account', { target_user_id: userId, mc_username, verified: true });
        const { data: bal } = await supabase.from('balances').select('balance').eq('user_id', userId).maybeSingle();
        const newBal = (bal?.balance || 0) + 1;
        if (!bal) await supabase.from('balances').insert({ user_id: userId, balance: newBal });
        else await supabase.from('balances').update({ balance: newBal }).eq('user_id', userId);
        await supabase.from('transactions').insert({ txn_id: 'MCV-' + Date.now(), user_id: userId, amount: 1, type: 'deposit', ref_id: 'MC-VERIFY-' + mc_username, note: `MC verification deposit from ${mc_username}` });
        return res.status(200).json({ success: true, message: `${mc_username} is now linked and verified! $1 deposited.` });
      }
      return res.status(400).json({ error: 'Invalid step' });
    }

    // --- staff actions (log + commission) ---
    const STAFF_ACTIONS = ['approve_ad', 'verify_site', 'review_site'];
    if (STAFF_ACTIONS.includes(action)) {
      await supabase.from('staff_logs').insert({ user_id: userId, role_name: roleName || 'Unknown', action, details });
      let commission = 0;
      if (action === 'approve_ad' && amount) commission = parseFloat(amount) * 0.10;
      else if (action === 'verify_site') commission = 10;
      else if (action === 'review_site') commission = 50;
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const weekStart = startOfWeek.toISOString().split('T')[0];
      const { data: currentPayroll } = await supabase.from('staff_payroll').select('*').eq('user_id', userId).eq('week_start', weekStart).maybeSingle();
      const currentActions = currentPayroll?.actions_count || 0;
      const currentBonus = currentPayroll?.bonus_pay || 0;
      await supabase.from('staff_payroll').upsert({
        user_id: userId, week_start: weekStart,
        week_end: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        actions_count: currentActions + 1, base_pay: currentPayroll?.base_pay || 0,
        bonus_pay: currentBonus + commission, total_due: (currentPayroll?.base_pay || 0) + currentBonus + commission,
        status: 'pending'
      }, { onConflict: 'user_id, week_start' });
      return res.status(200).json({ success: true, message: `Action logged. Commission earned: $${commission.toFixed(2)}` });
    }

    // --- treasury actions ---

    if (action === 'deposit') {
      const { data: profile } = await supabase.from('profiles').select('mc_verified').eq('id', userId).maybeSingle();
      if (!profile?.mc_verified) return res.status(403).json({ error: 'MC account not verified' });
      const playerUuid = await resolvePlayerUuid(mcUsername);
      const [txns] = await getTransactions(100);
      const expectedMemo = `payment from ${mcUsername.toLowerCase()} to business zec corporate account`;
      const validTxn = txns.find(t => {
        if (t.pluginSystem) return false;
        const memo = (t.memo || t.message || '').toLowerCase().trim();
        if (memo !== expectedMemo) return false;
        if ((t.initiatorUuid || '').toLowerCase() !== playerUuid?.toLowerCase()) return false;
        const settledAt = new Date(t.settledAt);
        if (Date.now() - settledAt > 30 * 60 * 1000) return false;
        return Math.abs(parseFloat(t.amount) - parseFloat(amount)) < 0.01;
      });
      if (!validTxn) return res.status(404).json({ error: 'Payment not found. Send exactly $' + amount + ' to business ZEC.' });
      const ref_id = `DC-${validTxn.txnId}`;
      const { data: existing } = await supabase.from('transactions').select('id').eq('ref_id', ref_id).maybeSingle();
      if (existing) return res.status(400).json({ error: 'Already deposited' });
      await supabase.rpc('increment_balance', { target_user_id: userId, deposit_amount: parseFloat(amount) });
      await supabase.from('transactions').insert({ user_id: userId, amount: parseFloat(amount), type: 'deposit', ref_id, note: `MC deposit from ${mcUsername}` });
      return res.status(200).json({ success: true, message: `Deposited $${amount}` });
    }

    if (action === 'manual-deposit') {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const targetUserId = req.body.targetUserId || userId;
      if (!refId) return res.status(400).json({ error: 'Missing refId' });
      const { data: profile } = await supabase.from('profiles').select('mc_username, mc_verified').eq('id', targetUserId).maybeSingle();
      if (!profile?.mc_verified) return res.status(403).json({ error: 'MC account not verified' });
      const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', refId).eq('type', 'deposit').maybeSingle();
      if (existing) return res.status(400).json({ error: 'Already deposited' });
      const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', targetUserId).maybeSingle();
      const newBal = (currentBal?.balance || 0) + parseFloat(amount);
      if (!currentBal) await supabase.from('balances').insert({ user_id: targetUserId, balance: newBal });
      else await supabase.from('balances').update({ balance: newBal }).eq('user_id', targetUserId);
      await supabase.from('transactions').insert({ user_id: targetUserId, amount: parseFloat(amount), type: 'deposit', ref_id: refId, note: `Manual deposit from ${profile.mc_username}` });
      return res.status(200).json({ success: true, message: `Deposited $${amount}` });
    }

    if (action === 'auto-deposit') {
      const [txns, err] = await getTransactions(50);
      if (err || !txns) return res.status(200).json({ processed: 0, error: err });
      const now = new Date();
      const lookback = 60 * 60 * 1000;
      let processed = 0;
      for (const t of txns) {
        try {
          const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
          let payer = "";
          const match1 = memo.match(/^business payment:\s*([a-zA-Z0-9_]+)\s*->/);
          if (match1) payer = match1[1];
          else { const match2 = memo.match(/^payment from\s+([a-zA-Z0-9_]+)\s+to business/); if (match2) payer = match2[1]; }
          if (!payer || !memo.includes('zen') && !memo.includes('zec')) continue;
          let amt = 0;
          try { amt = parseFloat(t.amount || 0); } catch { continue; }
          if (amt < 0.01) continue;
          if (t.settledAt && now - new Date(t.settledAt) > lookback) continue;
          const { data: urow } = await supabase.from('profiles').select('id').ilike('mc_username', payer).eq('mc_verified', true).maybeSingle();
          if (!urow) continue;
          const dc_txn_id = String(t.txnId || t.id || t.transactionId || "");
          if (!dc_txn_id) continue;
          const ref_id = "DC-" + dc_txn_id;
          const { data: existing } = await supabase.from('transactions').select('txn_id').eq('ref_id', ref_id).eq('type', 'deposit').maybeSingle();
          if (existing) continue;
          const new_txn_id = "ZEC-" + Math.random().toString(36).substring(2, 12).toUpperCase();
          const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', urow.id).maybeSingle();
          const newBal = (currentBal?.balance || 0) + amt;
          if (!currentBal) await supabase.from('balances').insert({ user_id: urow.id, balance: newBal });
          else await supabase.from('balances').update({ balance: newBal, updated_at: now.toISOString() }).eq('user_id', urow.id);
          await supabase.from('transactions').insert({ txn_id: new_txn_id, user_id: urow.id, amount: amt, type: 'deposit', ref_id, note: `Auto-detected from ${payer}` });
          processed++;
        } catch { continue; }
      }
      return res.status(200).json({ processed });
    }

    if (action === 'check-deposits') {
      if (mc_username === 'test' && parseFloat(amount || 0) > 0) {
        return res.status(200).json({ success: true, transaction: { txnId: 'MOCK-' + Date.now(), amount: parseFloat(amount) }, amount: parseFloat(amount) });
      }
      return res.status(404).json({ error: 'No payment found. Use username "test" to mock.' });
    }

    if (action === 'request-withdrawal') {
      if (!userName) return res.status(400).json({ error: 'Missing mc_username for withdrawal' });
      const { data: bal } = await supabase.from('balances').select('balance').eq('user_id', userId).maybeSingle();
      if (!bal || bal.balance < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });
      const newBal = bal.balance - parseFloat(amount);
      const { error: deductErr } = await supabase.from('balances').update({ balance: newBal }).eq('user_id', userId).eq('balance', bal.balance);
      if (deductErr || !deductErr) {
        const { data: checkBal } = await supabase.from('balances').select('balance').eq('user_id', userId).maybeSingle();
        if (!checkBal || checkBal.balance !== newBal) return res.status(409).json({ error: 'Balance changed, try again' });
      }
      await supabase.from('withdrawal_requests').insert({ user_id: userId, amount: parseFloat(amount), mc_username: userName, status: 'pending', balance_before: bal.balance, balance_after: newBal });
      return res.status(200).json({ success: true, message: `Withdrawal request for $${amount} submitted` });
    }

    if (action === 'approve-withdrawal') {
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { data: withdrawal } = await supabase.from('withdrawal_requests').select('*').eq('id', withdrawalId).maybeSingle();
      if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
      if (req.body.actionType === 'approve') {
        const { error } = await supabase.from('withdrawal_requests').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', withdrawalId);
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Withdrawal approved' });
      } else {
        const { data: currentBal } = await supabase.from('balances').select('balance').eq('user_id', withdrawal.user_id).maybeSingle();
        const refunded = (currentBal?.balance || 0) + parseFloat(withdrawal.amount);
        await supabase.from('balances').update({ balance: refunded }).eq('user_id', withdrawal.user_id);
        await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', withdrawalId);
        return res.status(200).json({ success: true, message: 'Withdrawal rejected, funds returned' });
      }
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
