export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { mc_username, amount } = req.body;
  console.log('[MOCK] Checking deposit for:', mc_username, amount);
  
  // Mock: Accept any payment from "test" user
  if (mc_username === 'test' && parseFloat(amount) > 0) {
    return res.status(200).json({
      success: true,
      transaction: { txnId: 'MOCK-' + Date.now(), amount: parseFloat(amount) },
      amount: parseFloat(amount)
    });
  }
  
  return res.status(404).json({ error: 'No payment found. Use username "test" to mock.' });
}
