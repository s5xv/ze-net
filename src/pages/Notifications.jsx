import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import Layout from '../components/Layout';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications(user?.id);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline">Mark all as read</button>}
        </div>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#303134] rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-2">When someone reviews your site or your verification status changes, you'll see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)} className={`cursor-pointer p-4 rounded-xl border ${n.is_read ? 'bg-white dark:bg-[#303134] border-gray-200 dark:border-gray-700' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    {n.message && <p className="text-sm text-gray-500 mt-1">{n.message}</p>}
                    <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
