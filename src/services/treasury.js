const TREASURY_API_BASE = 'https://api.democracycraft.net/economy/api/v1';

export const treasuryAPI = {
  // Verify a token and get account details
  verifyToken: async (token) => {
    const response = await fetch(`${TREASURY_API_BASE}/accounts/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Invalid token or API error');
    }
    
    return await response.json();
  },

  // Get transaction history
  getTransactions: async (token, accountId) => {
    const response = await fetch(`${TREASURY_API_BASE}/accounts/${accountId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    return await response.json();
  }
};
