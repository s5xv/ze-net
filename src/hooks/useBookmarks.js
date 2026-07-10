import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useBookmarks(user) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    } else {
      setBookmarks([]);
      setLoading(false);
    }
  }, [user]);

  const fetchBookmarks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookmarks')
      .select('site_id, sites(name, slug, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setBookmarks(data || []);
    setLoading(false);
  };

  const addBookmark = async (siteId) => {
    if (!user) return;

    const { error } = await supabase.from('bookmarks').insert({
      user_id: user.id,
      site_id: siteId
    });

    if (!error) {
      await fetchBookmarks();
    }
  };

  const removeBookmark = async (siteId) => {
    if (!user) return;

    await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('site_id', siteId);

    await fetchBookmarks();
  };

  const isBookmarked = (siteId) => {
    return bookmarks.some((b) => b.site_id === siteId);
  };

  return { bookmarks, loading, addBookmark, removeBookmark, isBookmarked };
}
