import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export function useBookmarks(user) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    } else {
      setBookmarks([]);
      setLoading(false);
    }
  }, [user?.id]);

  const fetchBookmarks = async () => {
    const id = ++fetchId.current;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bookmarks')
        .select('site_id, sites(name, slug, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (id === fetchId.current) setBookmarks(data || []);
    } catch (e) { console.error('Failed to fetch bookmarks:', e); }
    if (id === fetchId.current) setLoading(false);
  };

  const addBookmark = async (siteId) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('bookmarks').insert({
        user_id: user.id,
        site_id: siteId
      });
      if (!error) await fetchBookmarks();
    } catch (e) { console.error('Failed to add bookmark:', e); }
  };

  const removeBookmark = async (siteId) => {
    if (!user) return;
    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('site_id', siteId);
      await fetchBookmarks();
    } catch (e) { console.error('Failed to remove bookmark:', e); }
  };

  const isBookmarked = (siteId) => {
    return bookmarks.some((b) => b.site_id === siteId);
  };

  return { bookmarks, loading, addBookmark, removeBookmark, isBookmarked };
}
