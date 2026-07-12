import { supabase } from '../services/supabase';

// List of all possible achievements
const ACHIEVEMENTS = {
  first_search: { id: 'first_search', title: 'Curious Mind', xp: 10 },
  wiki_explorer: { id: 'wiki_explorer', title: 'Wiki Explorer', xp: 25 },
  site_visitor: { id: 'site_visitor', title: 'Site Surfer', xp: 50 },
  business_owner: { id: 'business_owner', title: 'Entrepreneur', xp: 100 },
  advertiser: { id: 'advertiser', title: 'Big Spender', xp: 150 },
  commenter: { id: 'commenter', title: 'Chatterbox', xp: 20 },
  reviewer: { id: 'reviewer', title: 'Critic', xp: 30 },
};

export const checkAndUnlockAchievements = async (userId) => {
  if (!userId) return;

  try {
    // 1. Check First Search
    const { count: searchCount } = await supabase.from('search_history').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (searchCount > 0) await unlockAchievement(userId, ACHIEVEMENTS.first_search);

    // 2. Check Commenter
    const { count: commentCount } = await supabase.from('site_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (commentCount > 0) await unlockAchievement(userId, ACHIEVEMENTS.commenter);

    // 3. Check Reviewer
    const { count: reviewCount } = await supabase.from('site_reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (reviewCount > 0) await unlockAchievement(userId, ACHIEVEMENTS.reviewer);

    // 4. Check Business Owner
    const { count: bizCount } = await supabase.from('business_registrations').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (bizCount > 0) await unlockAchievement(userId, ACHIEVEMENTS.business_owner);

    // 5. Check Advertiser
    const { count: adCount } = await supabase.from('ad_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (adCount > 0) await unlockAchievement(userId, ACHIEVEMENTS.advertiser);

  } catch (err) {
    console.error('Tracker error:', err);
  }
};

const unlockAchievement = async (userId, achievement) => {
  try {
    const { data: existing } = await supabase.from('user_achievements').select('id').eq('user_id', userId).eq('achievement_id', achievement.id).maybeSingle();
    
    if (!existing) {
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id
      });
      console.log(`Unlocked: ${achievement.title}`);
    }
  } catch (e) { console.error('Failed to unlock achievement:', e); }
};

export const updateChallengeProgress = async (userId, siteId) => {
  if (!userId || !siteId) return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: challenge } = await supabase.from('daily_challenges').select('*').eq('date', today).maybeSingle();
    
    if (challenge) {
      const { data: existing } = await supabase.from('challenge_progress').select('id').eq('user_id', userId).eq('challenge_id', challenge.id).eq('site_id', siteId).maybeSingle();
      
      if (!existing) {
        await supabase.from('challenge_progress').insert({
          user_id: userId,
          challenge_id: challenge.id,
          site_id: siteId
        });
      }
    }
  } catch (err) {
    console.error('Challenge update error:', err);
  }
};
