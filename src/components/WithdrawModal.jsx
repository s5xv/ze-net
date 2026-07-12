import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function WithdrawModal({ balance, onUpdate, onClose }) {
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
        setTimeout(() => onUpdate(), 2000);
      } else {
        setMessage('❌ ' + data.error);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">💰 Withdraw Funds</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Available: <span className="font-bold text-green-500">${balance?.toFixed(2) || '0.00'}</span>
      </p>
      
      <form onSubmit={handleWithdraw} className="space-y-4">
        <input 
          type="number" 
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to withdraw"
          className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
          required
        />
        <button 
          type="submit" 
          disabled={loading || !amount}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white rounded-lg font-bold"
        >
          {loading ? 'Processing...' : 'Request Withdraw'}
        </button>
      </form>
      {message && <p className="text-sm mt-4 text-center">{message}</p>}
    </div>
  );
}
