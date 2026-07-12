import { createClient } from '@supabase/supabase-js';
import { resolvePlayerUuid, getTransactions } from './treasury.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId, mc_username, step } = req.body;
  if (!userId || !mc_username) return res.status(400).json({ error: 'Missing data' });

  try {
    if (step === 'init') {
      // Step 1: Register the MC username
      await supabase.from('profiles').upsert({
        id: userId,
        mc_username: mc_username,
        mc_verified: false
      }, { onConflict: 'id' });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Step 1 complete. Run `/pay-account business ZEC 1` in-game, then click "Verify Payment" below.' 
      });
    } 
    
    if (step === 'confirm') {
      // Step 2: Check for the $1 payment
      const { data: profile } = await supabase.from('profiles').select('mc_username, mc_verified').eq('id', userId).single();
      
      if (profile?.mc_verified) {
        return res.status(200).json({ success: true, message: `Already verified as ${profile.mc_username}` });
      }

      // Fetch transactions from Treasury API
      const [txns, err] = await getTransactions(100);
      if (err) return res.status(500).json({ error: 'Treasury API error: ' + err });

      // Resolve player UUID
      const playerUuid = await resolvePlayerUuid(mc_username);
      if (!playerUuid) return res.status(404).json({ error: `Could not find player ${mc_username}` });

      const expectedMemo = `payment from ${mc_username.toLowerCase()} to business zec corporate account`;
      const now = new Date();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      // Find the $1 payment
      let found = false;
      for (const txn of txns) {
        if (txn.pluginSystem !== null && txn.pluginSystem !== undefined) continue;
        
        const memo = (txn.memo || txn.message || '').toLowerCase().trim();
        if (memo !== expectedMemo) continue;

        const initiator = (txn.initiatorUuid || '').toLowerCase();
        if (initiator !== playerUuid.toLowerCase()) continue;

        const settledAt = new Date(txn.settledAt);
        if (now - settledAt > maxAge) continue;

        const amount = parseFloat(txn.amount || 0);
        if (Math.abs(amount - 1.0) > 0.001) continue; // MUST be exactly $1

        found = true;
        break;
      }

      if (!found) {
        return res.status(404).json({ 
          error: `No $1 payment from ${mc_username} found.\n\nMake sure you:\n1. Ran /pay-account business ZEC 1 in-game\n2. Used the exact username: ${mc_username}\n3. Waited a few seconds after paying` 
        });
      }

      // Mark as verified
      await supabase.from('profiles').update({ 
        mc_verified: true,
        mc_username: mc_username
      }).eq('id', userId);

      return res.status(200).json({ 
        success: true, 
        message: `${mc_username} is now linked and verified! You can now deposit funds.` 
      });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
