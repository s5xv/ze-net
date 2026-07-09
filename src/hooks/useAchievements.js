import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';

export const ACHIEVEMENTS = {
  first_login: { title: 'Welcome!', description: 'Sign in for the first time', icon: '👋', xp: 10 },
  linked_account: { title: 'Connected', description: 'Link your Minecraft account', icon: '🔗', xp: 25 },
  first_deposit: { title: 'First Deposit', description: 'Make your first deposit', icon: '💰', xp: 20 },
  deposit_10: { title: 'Investor', description: 'Deposit $10 total', icon: '💵', xp: 30 },
  deposit_100: { title: 'Whale', description: 'Deposit $100 total', icon: '🐋', xp: 100 },
  search_10: { title: 'Explorer', description: 'Perform 10 searches', icon: '🔍', xp: 15 },
  search_100: { title: 'Search Master', description: 'Perform 100 searches', icon: '🎯', xp: 50 },
  bookmark_5: { title: 'Collector', description: 'Bookmark 5 sites', icon: '⭐', xp: 20 },
  visit_25: { title: 'Tourist', description: 'Visit 25 different sites', icon: '🗺️', xp: 40 },
  challenge_complete: { title: 'Challenger', description: 'Complete a daily challenge', icon: '🏆', xp: 50 },
  review_first: { title: 'Critic', description: 'Leave your first review', icon: '✍️', xp: 15 },
  comment_first: { title: 'Conversationalist', description: 'Leave your first comment', icon: '💬', xp: 15 },
  lucky_find: { title: 'Lucky', description: 'Use "I\'m Feeling Lucky"', icon: '🎲', xp: 10 },
  wiki_explorer: { title: 'Wiki Explorer', description: 'Visit 10 wiki pages', icon: '📚', xp: 30 },
  miner: { title: 'Miner', description: 'Score 50+ in the mining game', icon: '⛏️', xp: 25 },
};

export function useAchievements(user) {
  const [unlocked, setUnlocked] = useState([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState(null);

  useEffect(() => {
    if (user) fetchUnlocked();
  }, [user]);

  const fetchUnlocked = async () => {
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_key')
      .eq('user_id', user.id);
    setUnlocked(data?.map(d => d.achievement_key) || []);
  };

  const unlock = async (key) => {
    if (!user || unlocked.includes(key)) return false;
    
    const { error } = await supabase.from('user_achievements').insert({
      user_id: user.id,
      achievement_key: key
    });
    
    if (!error) {
      setUnlocked(prev => [...prev, key]);
      setNewlyUnlocked(ACHIEVEMENTS[key]);
      setTimeout(() => setNewlyUnlocked(null), 4000);
      return true;
    }
    return false;
  };

  const isUnlocked = (key) => unlocked.includes(key);

  return { unlocked, newlyUnlocked, unlock, isUnlocked, fetchUnlocked };
}
