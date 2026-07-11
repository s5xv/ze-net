const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const TOKEN = process.env.TREASURY_BUSINESS_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;

export async function getTransactions(limit = 50) {
  const res = await fetch(`${BASE_URL}/accounts/${ZEC_ACCOUNT_ID}/transactions?limit=${limit}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!res.ok) throw new Error('Treasury API error');
  const data = await res.json();
  return data.items || [];
}

export async function resolvePlayerUuid(username) {
  const res = await fetch(`${BASE_URL}/accounts/by-player?name=${username}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.playerUuid;
}
