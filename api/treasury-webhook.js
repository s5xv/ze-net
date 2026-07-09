import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN;
const ZANDENET_ACCOUNT_ID = '123945';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify signature...
    const signature = req.headers['x-treasury-signature'];
    const rawBody = JSON.stringify(req.body);
    if (process.env.TREASURY_WEBHOOK_SECRET && signature) {
      const expected = 'sha256=' + crypto.createHmac('sha256', process.env.TREASURY_WEBHOOK_SECRET).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    if (event.event !== 'transaction') return res.status(200).json({ message: 'Event ignored' });

    const transaction = event.transaction;
    const accountId = String(event.accountId);
    const amount = parseFloat(transaction.amount);
    const memo = transaction.memo || '';

    if (amount <= 0 || accountId !== ZANDENET_ACCOUNT_ID) {
      return res.status(200).json({ message: 'Not relevant transaction' });
    }

    // 1. Check if it's a Verification Code (6 digits)
    const verifyMatch = memo.match(/\b\d{6}\b/);
    if (verifyMatch) {
      // ... (Keep your existing verification logic here) ...
      return res.status(200).json({ message: 'Verification processed' });
    }

    // 2. Check if it's a Deposit Code (DEP-123456)
    const depositMatch = memo.match(/DEP-\d{6}/);
    if (depositMatch) {
      const code = depositMatch[0];

      // Find the code in the database
      const { data: depositData, error } = await supabase
      .from('deposit_codes')
      .select('user_id')
      .eq('code', code)
      .eq('status', 'pending')
      .single();

      if (!error && depositData) {
        // Add money to their site balance
        const { data: balData } = await supabase.from('site_balances').select('balance').eq('user_id', depositData.user_id).single();
        const newBalance = (balData?.balance || 0) + amount;

        await supabase.from('site_balances').upsert({ user_id: depositData.user_id, balance: newBalance });
        await supabase.from('deposit_codes').update({ status: 'completed' }).eq('code', code);

        return res.status(200).json({ message: 'Deposit processed' });
      }
    }

    return res.status(200).json({ message: 'No matching action for memo' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
