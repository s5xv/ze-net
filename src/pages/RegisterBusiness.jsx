import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function RegisterBusiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_discord: '',
    category: 'Retail Shop',
    plot_number: '',
    discord_invite: '',
    website_url: ''
  });

  const categories = [
    // Retail & Shopping
    'Retail Shop', 'Department Store', 'Convenience Store', 'Grocery Store', 'Supermarket',
    'Clothing Store', 'Shoe Store', 'Jewelry Store', 'Electronics Store', 'Furniture Store',
    'Bookstore', 'Toy Store', 'Pet Store', 'Florist', 'Gift Shop', 'Antique Shop',
    
    // Food & Dining
    'Restaurant', 'Fast Food', 'Cafe', 'Bakery', 'Bar', 'Pub', 'Nightclub',
    'Food Truck', 'Ice Cream Shop', 'Pizza Place', 'Sushi Restaurant', 'Steakhouse',
    
    // Services
    'Legal Service', 'Accounting Service', 'Real Estate Agency', 'Insurance Agency',
    'Travel Agency', 'Consulting Firm', 'Marketing Agency', 'Advertising Agency',
    'Cleaning Service', 'Landscaping Service', 'Repair Service', 'Plumbing Service',
    'Electrical Service', 'Moving Company', 'Security Service',
    
    // Creative & Arts
    'Art Studio', 'Music Studio', 'Photography Studio', 'Design Studio',
    'Tattoo Parlor', 'Hair Salon', 'Barbershop', 'Spa', 'Gym', 'Yoga Studio',
    
    // Professional
    'Corporate Office', 'Bank', 'Law Firm', 'Medical Clinic', 'Dental Office',
    'Veterinary Clinic', 'Pharmacy', 'Post Office', 'Library',
    
    // Entertainment
    'Movie Theater', 'Bowling Alley', 'Arcade', 'Casino', 'Theater',
    'Music Venue', 'Sports Arena', 'Amusement Park',
    
    // Industrial
    'Warehouse', 'Factory', 'Workshop', 'Garage', 'Storage Facility',
    
    // Other
    'Hotel', 'Motel', 'Hostel', 'Church', 'School', 'University', 'Government Building',
    'Police Station', 'Fire Station', 'Hospital', 'Parking Garage', 'Gas Station',
    'Auto Repair', 'Car Dealership', 'Construction Company', 'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to register a business');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('business_registrations').insert({
        ...formData,
        user_id: user.id,
        status: 'pending'
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout user={user}>
        <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4">Registration Submitted!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your business registration is pending admin review. You'll be notified once it's approved.
            </p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Back to Home
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Register Your Business</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Submit your business for review and listing on Z&E Net</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name *</label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Exact name used in game"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Owner Discord Username *</label>
              <input
                type="text"
                required
                value={formData.owner_discord}
                onChange={(e) => setFormData({...formData, owner_discord: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="e.g., username#1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Plot Number *</label>
              <input
                type="text"
                required
                value={formData.plot_number}
                onChange={(e) => setFormData({...formData, plot_number: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="e.g., A123, B456, C789"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your plot number (e.g., A123, B456)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Discord Invite Link</label>
              <input
                type="url"
                value={formData.discord_invite}
                onChange={(e) => setFormData({...formData, discord_invite: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://discord.gg/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Website URL (Optional)</label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
