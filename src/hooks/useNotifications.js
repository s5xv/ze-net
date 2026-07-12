import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef();

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (e) { console.error('Failed to fetch notifications:', e); }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetch]);

  const markRead = async (id) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) { console.error('Failed to mark read:', e); }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).is('is_read', false);
    } catch (e) { console.error('Failed to mark all read:', e); }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetch };
}
