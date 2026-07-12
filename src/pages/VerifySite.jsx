import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function VerifySite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ownedSites, setOwnedSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) fetchOwnedSites();
  }, [user]);

  const fetchOwnedSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setOwnedSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !selectedSiteId) return;
    
    setSubmitting(true);
    setMessage('');

    try {
      const selectedSite = ownedSites.find(s => s.id === selectedSiteId);
      if (!selectedSite) throw new Error('Site not found');

      const { error } = await supabase.from('site_verification_requests').insert({
        user_id: user.id,
        site_id: selectedSiteId,
        site_name: selectedSite.name,
        site_url: selectedSite.url,
        description: selectedSite.description,
        category: selectedSite.category,
        status: 'pending'
      });

      if (error) throw error;

      setMessage('✅ Verification request submitted! Admin will review within 24 hours.');
      setTimeout(() => navigate('/profile'), 3000);
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Please sign in to verify your site</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">Verify Your Site</h1>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
              $100 ONE-TIME
            </span>
          </div>
          
          <p className="text-gray-400 mb-6">
            Get the official verified checkmark next to your site name to build trust with users.
            This is a <strong className="text-white">$100 one-time fee</strong> (not a subscription).
          </p>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-blue-300 mb-3">What you get:</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>✓ Verified checkmark badge</li>
              <li>✓ Higher ranking in search results</li>
              <li>✓ Increased trust from users</li>
              <li>✓ Priority support</li>
              <li>✓ Permanent verification (no renewals)</li>
            </ul>
          </div>

          {ownedSites.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You don't own any sites yet.</p>
              <button
                onClick={() => navigate('/submit-ad')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Submit Your First Site
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Site to Verify *
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Choose a site...</option>
                  {ownedSites.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.category}) {site.is_verified ? '✓ Already Verified' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                  <p className={message.includes('✅') ? 'text-green-400' : 'text-red-400'}>{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedSiteId}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold text-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Verification Request ($100)'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                After submission, you'll receive payment instructions via Discord DM.
              </p>
            </form>
          )}
        </div>
      </main>
    </Layout>
  );
}
