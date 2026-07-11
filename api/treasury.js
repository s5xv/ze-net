import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.democracycraft.net/economy/api/v1";
const DC_API_TOKEN = process.env.DC_TREASURY_TOKEN;
const ZEC_ACCOUNT_ID = process.env.ZEC_ACCOUNT_ID;

const _headers = () => ({ "Authorization": "Bearer " + DC_API_TOKEN });

export async function getBalance() {
  if (!DC_API_TOKEN || !ZEC_ACCOUNT_ID) return [null, "Config missing"];
  try {
    const r = await fetch(BASE_URL + "/accounts/" + ZEC_ACCOUNT_ID + "/balance", { headers: _headers() });
    if (!r.ok) return [null, "API error"];
    const data = await r.json();
    return [data.balance, null];
  } catch (e) { return [null, e.message]; }
}

export async function getTransactions(limit = 50) {
  if (!DC_API_TOKEN || !ZEC_ACCOUNT_ID) return [null, "Config missing"];
  try {
    const r = await fetch(BASE_URL + "/accounts/" + ZEC_ACCOUNT_ID + "/transactions?limit=" + limit + "&page=1", { headers: _headers() });
    if (!r.ok) return [null, "API error"];
    const data = await r.json();
    return [data.items || [], null];
  } catch (e) { return [null, e.message]; }
}

export async function resolvePlayerUuid(mc_username) {
  if (!DC_API_TOKEN) return null;
  try {
    const r = await fetch(BASE_URL + "/accounts/by-player?name=" + mc_username, { headers: _headers() });
    if (!r.ok) return null;
    const data = await r.json();
    return data.playerUuid || null;
  } catch (e) { return null; }
}

export async function findPaymentFrom(mc_username, exact_amount) {
  const [txns, err] = await getTransactions(100);
  if (err) return [null, err];

  const initiator_uuid_target = await resolvePlayerUuid(mc_username);
  if (!initiator_uuid_target) return [null, "Could not find player " + mc_username];

  // FIX: Accept BOTH "business zen" and "business zec"
  const expectedStart = `payment from ${mc_username.toLowerCase()} to business `;
  const expectedEnd = ` corporate account`;
  
  const now = new Date();
  const max_age = 60 * 60 * 1000; // Increased to 1 hour just in case

  for (const t of txns) {
    if (t.pluginSystem !== null && t.pluginSystem !== undefined) continue;
    
    const memo = ((t.memo || t.message || "") + "").trim().toLowerCase();
    
    // Flexible matching
    if (!memo.startsWith(expectedStart) || !memo.endsWith(expectedEnd)) continue;

    const initiator = (t.initiatorUuid || "").toLowerCase();
    if (initiator !== initiator_uuid_target.toLowerCase()) continue;

    const settled_at = new Date(t.settledAt);
    if (isNaN(settled_at.getTime())) continue;
    if (now - settled_at > max_age) continue;

    let txn_amount = 0;
    try { txn_amount = parseFloat(t.amount || 0); } catch (e) { continue; }
    if (Math.abs(txn_amount - parseFloat(exact_amount)) > 0.001) continue;

    return [t, null];
  }
  return [null, null];
}
