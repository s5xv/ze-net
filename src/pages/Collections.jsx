import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Collections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [collections, setCollections] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', is_public: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchCollections();
  }, [user]);

  const fetchCollections = async () => {
    const { data } = await supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setCollections(data || []);
    setLoading(false);
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('collections').insert({
      ...newCollection,
      user_id: user.id
    });
    if (error) {
      alert('Error creating collection: ' + error.message);
    } else {
      alert('Collection created!');
      setShowCreateModal(false);
      setNewCollection({ name: '', description: '', is_public: true });
      fetchCollections();
    }
  };

  const handleDeleteCollection = async (id) => {
    if (confirm('Delete this collection?')) {
      await supabase.from('collections').delete().eq('id', id);
      fetchCollections();
    }
  };

  if (!user) {
    return (
      <Layout user={user}>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Please sign in to view your collections</p>
            <button onClick={() => navigate('/login')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Sign In</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Collections</h1>
          <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            + Create Collection
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-500 mb-4">You don't have any collections yet</p>
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Create Your First Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div key={collection.id} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{collection.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${collection.is_public ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}`}>
                    {collection.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                {collection.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{collection.description}</p>}
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/collection/${collection.id}`)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    View Collection
                  </button>
                  <button onClick={() => handleDeleteCollection(collection.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Collection Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#303134] rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Create New Collection</h2>
              <form onSubmit={handleCreateCollection}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Collection Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={newCollection.name} 
                    onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                    placeholder="e.g., Best Food Spots"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea 
                    value={newCollection.description} 
                    onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"
                    rows="3"
                    placeholder="Describe your collection..."
                  />
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newCollection.is_public} 
                    onChange={(e) => setNewCollection({...newCollection, is_public: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">Make this collection public</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
