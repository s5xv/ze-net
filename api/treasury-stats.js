export default async function handler(req, res) {
  const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';
  const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN;
  const ZANDENET_ACCOUNT_ID = '123945';
  const BLUEMAP_URL = 'https://map.democracycraft.net/maps/reveille/live/players.json';

  try {
    // Get balance
    const balanceRes = await fetch(`${TREASURY_API_BASE}/accounts/${ZANDENET_ACCOUNT_ID}/balance`, {
      headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
    });
    const balanceData = balanceRes.ok ? await balanceRes.json() : { balance: 0 };

    // Get recent transactions
    const txnsRes = await fetch(`${TREASURY_API_BASE}/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=10`, {
      headers: { 'Authorization': `Bearer ${BUSINESS_API_TOKEN}` }
      });
    const txnsData = txnsRes.ok ? await txnsRes.json() : { items: [] };

    // Get online players
    const playersRes = await fetch(BLUEMAP_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZENet/1.0)' }
    });
    const playersData = playersRes.ok ? await playersRes.json() : { players: [] };

    return res.status(200).json({
      balance: balanceData.balance || 0,
      recentTransactions: txnsData.items || [],
      onlinePlayers: playersData.players || []
    });

  } catch (error) {
    console.error('Treasury stats error:', error);
    return res.status(500).json({ error: error.message });
  }
}
