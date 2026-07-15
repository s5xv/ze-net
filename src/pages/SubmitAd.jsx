import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function SubmitAd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ownedSites, setOwnedSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [tier, setTier] = useState('standard');
  const [extraDays, setExtraDays] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => { return () => clearTimeout(timeoutRef.current); }, []);

  const tiers = {
    standard: { name: 'Standard', price: 110, dailyExtra: 10, description: 'Basic banner placement' },
    featured: { name: 'Featured', price: 160, dailyExtra: 20, description: 'Highlighted position' },
    premium: { name: 'Premium', price: 400, dailyExtra: 30, description: 'Top placement + rotation' },
    elite: { name: 'Elite', price: 600, dailyExtra: 40, description: 'Premium spot + featured badge' }
  };

  const totalDays = 7 + extraDays;
  const totalPrice = tiers[tier].price + extraDays * tiers[tier].dailyExtra;

  useEffect(() => {
    if (user) fetchOwnedSites();
  }, [user]);

  const fetchOwnedSites = async () => {
    try {
      const { data, error } = await supabase.from('sites').select('*').eq('user_id', user.id);
      if (error) throw error;
      setOwnedSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
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

      const extraDaysVal = extraDays;
      const { error } = await supabase.from('ad_requests').insert({
        user_id: user.id,
        site_id: selectedSiteId,
        site_name: selectedSite.name,
        tier: tier,
        price: totalPrice,
        image_url: imageUrl,
        description: `${description}||D:${7 + extraDaysVal}`,
        status: 'pending'
      });
      if (error) throw error;

      const { data: admins } = await supabase.from('profiles').select('id').eq('is_staff', true);
      if (admins && admins.length > 0) {
        const notif = { type: 'ad_request', title: 'New Ad Request', body: `${selectedSite.name} - ${tiers[tier].name} ($${totalPrice}, ${7 + extraDaysVal}d)`, link: '/admin' };
        await supabase.from('notifications').insert(admins.map(a => ({ ...notif, user_id: a.id })));
      }

      setMessage('Ad request submitted! Admin will review within 24 hours.');
      timeoutRef.current = setTimeout(() => navigate('/home'), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setSubmitting(false);
  };

  if (!user) return <Layout><div className="p-8 text-center text-white">Please sign in</div></Layout>;

  return (
    <Layout>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#303134] border border-gray-700 rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Submit Ad Request</h1>

          {loading ? (
            <div className="text-center text-gray-400">Loading your sites...</div>
          ) : ownedSites.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You don't own any sites yet.</p>
              <button onClick={() => navigate('/profile')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Go to Profile</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Site *</label>
                <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} required className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white">
                  <option value="">Choose a site...</option>
                  {ownedSites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Ad Tier *</label>
                <select value={tier} onChange={(e) => { setTier(e.target.value); setExtraDays(0); }} className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white">
                  {Object.entries(tiers).map(([key, t]) => (
                    <option key={key} value={key}>{t.name} - ${t.price}/7d (${t.dailyExtra}/day extra)</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{tiers[tier].description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="90" value={extraDays} onChange={(e) => setExtraDays(parseInt(e.target.value))} className="flex-1" />
                  <span className="text-white text-sm font-mono w-24 text-right">{totalDays} days</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>7 days (base)</span>
                  <span>+{extraDays} extra days (${extraDays * tiers[tier].dailyExtra})</span>
                </div>
                <p className="text-sm text-blue-400 font-bold mt-2">Total: ${totalPrice}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Ad Image URL (Imgur)</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://i.imgur.com/..." className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
                <p className="text-xs text-gray-500 mt-1">Upload to Imgur → right-click the image → <strong className="text-gray-300">Copy Image Address</strong> → paste here (use direct <code className="text-blue-400">i.imgur.com</code> link, not album URL)</p>
                {imageUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Preview:</p>
                    <img src={imageUrl} alt="Preview" className="max-w-xs rounded border border-gray-700" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Brief description of your ad..." className="w-full px-4 py-3 bg-[#202124] border border-gray-700 rounded-lg text-white placeholder-gray-500" />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.includes('!') ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-red-900/30 border border-red-800 text-red-400'}`}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={submitting || !selectedSiteId} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold text-lg">
                {submitting ? 'Submitting...' : `Submit Ad Request ($${totalPrice} — ${totalDays}d)`}
              </button>

              <p className="text-xs text-gray-500 text-center">After submission, you'll receive payment instructions via Discord DM.</p>
            </form>
          )}
        </div>
      </main>
    </Layout>
  );
}
