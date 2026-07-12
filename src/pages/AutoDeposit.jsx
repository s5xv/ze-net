import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { Button } from '../components/UI';

export default function AutoDeposit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [firmName, setFirmName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [percentage, setPercentage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchRules();
  }, [user, navigate]);

  const fetchRules = async () => {
    const { data } = await supabase
      .from('auto_deposit_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setRules(data || []);
    setLoading(false);
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('auto_deposit_rules')
      .insert({
        user_id: user.id,
        target_firm_name: firmName,
        target_account_id: accountId,
        percentage: parseFloat(percentage)
      });

    if (!error) {
      setShowForm(false);
      setFirmName('');
      setAccountId('');
      setPercentage('');
      fetchRules();
    }
  };

  const handleDeleteRule = async (id) => {
    await supabase
      .from('auto_deposit_rules')
      .delete()
      .eq('id', id);
    fetchRules();
  };

  const handleToggleRule = async (id, currentStatus) => {
    await supabase
      .from('auto_deposit_rules')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchRules();
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Auto-Deposit Rules</h1>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'New Rule'}
          </Button>
        </div>

        {showForm && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Rule</h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Firm Name</label>
                  <input
                    type="text"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="Acme"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Account ID</label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="B:G"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Percentage (%)</label>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="10"
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="primary">Save Rule</Button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading rules...</p>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
            <p className="text-gray-400">No auto-deposit rules configured.</p>
            <p className="text-gray-600 text-sm mt-2">Create a rule to automatically route a percentage of your income to a firm account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{rule.target_firm_name}</h3>
                  <p className="text-gray-400 text-sm">Account: {rule.target_account_id}</p>
                  <p className="text-blue-400 text-sm font-medium mt-1">{rule.percentage}% of incoming funds</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rule.is_active 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                  >
                    {rule.is_active ? 'Active' : 'Paused'}
                  </button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
