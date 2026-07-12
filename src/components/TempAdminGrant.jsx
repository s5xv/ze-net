import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function TempAdminGrant() {
  const [email, setEmail] = useState('');
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGrant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', `%${email}%`)
        .maybeSingle();

      if (userError || !userData) {
        setMessage('User not found');
        setLoading(false);
        return;
      }

      // Grant temp admin
      const { error } = await supabase.rpc('grant_temp_admin', {
        target_user_id: userData.id,
        duration_hours: duration
      });

      if (error) throw error;
      setMessage(`✓ Admin access granted for ${duration} hours`);
      setEmail('');
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">🔐 Grant Temporary Admin</h2>
      <form onSubmit={handleGrant} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">User Email or Discord Name</label>
          <input 
            type="text" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Duration (hours)</label>
          <select 
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value={1}>1 hour</option>
            <option value={24}>24 hours (1 day)</option>
            <option value={72}>72 hours (3 days)</option>
            <option value={168}>168 hours (1 week)</option>
            <option value={720}>720 hours (1 month)</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
        >
          {loading ? 'Granting...' : 'Grant Admin Access'}
        </button>
        {message && <p className="text-sm text-center mt-2">{message}</p>}
      </form>
    </div>
  );
}
