import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell({ userId }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex gap-2">
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
              <button onClick={() => { navigate('/notifications'); setOpen(false); }} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
            ) : (
              notifications.slice(0, 10).map(n => (
                <button key={n.id} onClick={() => { markRead(n.id); setOpen(false); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3c4043] border-b border-gray-100 dark:border-gray-700/50 ${!n.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
