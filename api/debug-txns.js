export default async function handler(req, res) {
  const TREASURY_API_BASE = 'https://api.democracycraft.net/economy';
  const BUSINESS_API_TOKEN = process.env.TREASURY_BUSINESS_TOKEN; 
  const ZANDENET_ACCOUNT_ID = '123945'; 

  try {
    const response = await fetch(`${TREASURY_API_BASE}/api/v1/accounts/${ZANDENET_ACCOUNT_ID}/transactions?limit=5`, {
      headers: {
        'Authorization': `Bearer ${BUSINESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API returned ${response.status}`, text: await response.text() });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
