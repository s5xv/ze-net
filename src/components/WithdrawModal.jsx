import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function WithdrawModal({ balance, onUpdate }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: parseFloat(amount) })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Withdrawal requested! Admin will process it soon.');
        setAmount('');
        onUpdate(); // Refresh balance
      } else {
        setMessage('❌ ' + data.error);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">💰 Withdraw Funds</h2>
      <p className="text-sm text-gray-500 mb-4">Current Balance: <span className="font-bold text-green-500">${balance?.toFixed(2) || '0.00'}</span></p>
      
      <form onSubmit={handleWithdraw} className="flex gap-3">
        <input 
          type="number" 
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to withdraw"
          className="flex-grow px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
          required
        />
        <button 
          type="submit" 
          disabled={loading || !amount}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white rounded-lg font-bold"
        >
          {loading ? 'Processing...' : 'Request Withdraw'}
        </button>
      </form>
      {message && <p className="text-sm mt-3">{message}</p>}
    </div>
  );
}
