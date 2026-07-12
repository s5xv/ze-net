import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth'; // <-- FIXED: Added the missing import

export default function WithdrawModal({ balance, onUpdate, onClose }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        status: 'pending'
      });
      
      if (error) throw error;
      
      setMessage('Withdrawal requested! Admin will process it.');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 2000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Withdraw Funds</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>
      
      <p className="text-gray-400 mb-4">Available: <span className="text-green-500 font-bold">${balance.toFixed(2)}</span></p>
      
      <form onSubmit={handleWithdraw}>
        <input
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full px-4 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white mb-4"
          required
        />
        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold"
        >
          {loading ? 'Processing...' : 'Request Withdraw'}
        </button>
      </form>
      
      {message && <p className="mt-4 text-sm text-center text-blue-400">{message}</p>}
    </div>
  );
}
