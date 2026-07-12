import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import ImageUpload from '../components/ImageUpload';

export default function Settings() {
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [adPrefs, setAdPrefs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('bio, avatar_url, ad_preferences').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) { setBio(data.bio || ''); setAvatarUrl(data.avatar_url || ''); setAdPrefs(data.ad_preferences || []); }
      });
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('profiles').upsert({ id: user.id, bio, avatar_url: avatarUrl, ad_preferences: adPrefs }, { onConflict: 'id' });
    setMessage(error ? 'Error: ' + error.message : 'Settings saved!');
    setSaving(false);
  };

  const allCategories = ['shop', 'bank', 'casino', 'service', 'entertainment', 'government', 'education'];

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        {message && <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Avatar</label>
              <div className="flex items-center gap-4">
                {avatarUrl && <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />}
                <ImageUpload bucket="avatars" path={user?.id} onUpload={setAvatarUrl} label="Upload Avatar" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#303134] rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold">Ad Preferences</h2>
            <p className="text-sm text-gray-500">Choose which ad categories you want to see.</p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={adPrefs.includes(cat)} onChange={() => setAdPrefs(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className="rounded" />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </Layout>
  );
}
