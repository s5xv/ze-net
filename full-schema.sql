-- ============================================================
-- Z&E Net — Full Database Schema
-- Run this ENTIRE file in Supabase Dashboard → SQL Editor
-- ============================================================

SET search_path TO public;

-- Drop everything for a clean slate
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.forum_cache CASCADE;
DROP TABLE IF EXISTS public.treasury_tokens CASCADE;
DROP TABLE IF EXISTS public.auto_deposit_rules CASCADE;
DROP TABLE IF EXISTS public.staff_payroll CASCADE;
DROP TABLE IF EXISTS public.staff_logs CASCADE;
DROP TABLE IF EXISTS public.business_registrations CASCADE;
DROP TABLE IF EXISTS public.challenge_progress CASCADE;
DROP TABLE IF EXISTS public.daily_challenges CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.search_analytics CASCADE;
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.wiki_comments CASCADE;
DROP TABLE IF EXISTS public.wiki_pages CASCADE;
DROP TABLE IF EXISTS public.site_verification_requests CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.ad_requests CASCADE;
DROP TABLE IF EXISTS public.site_announcements CASCADE;
DROP TABLE IF EXISTS public.site_reports CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.site_followers CASCADE;
DROP TABLE IF EXISTS public.site_comments CASCADE;
DROP TABLE IF EXISTS public.site_reviews CASCADE;
DROP TABLE IF EXISTS public.site_upvotes CASCADE;
DROP TABLE IF EXISTS public.site_views CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.balances CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  bio text,
  avatar_url text,
  ad_preferences jsonb DEFAULT '[]'::jsonb,
  mc_username text,
  mc_verified boolean DEFAULT false,
  is_staff boolean DEFAULT false,
  staff_permissions jsonb DEFAULT '[]'::jsonb,
  xp integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Balances
CREATE TABLE public.balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_balances_user ON public.balances(user_id);

-- Sites directory
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  url text NOT NULL,
  category text DEFAULT 'Other',
  description text DEFAULT '',
  shortcuts text,
  keywords text[] DEFAULT '{}',
  image_url text,
  owner_user_id uuid REFERENCES auth.users(id),
  user_id uuid REFERENCES auth.users(id),
  owner_name text DEFAULT 'Unknown',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  ad_tier text,
  ad_price numeric,
  ad_expires_at timestamptz,
  verification_paid_at timestamptz,
  plot_number text,
  discord_invite text,
  shortcut text,
  submitted_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sites_slug ON public.sites(slug);
CREATE INDEX idx_sites_status ON public.sites(status);
CREATE INDEX idx_sites_category ON public.sites(category);
CREATE INDEX idx_sites_owner ON public.sites(owner_user_id);
CREATE INDEX idx_sites_ad ON public.sites(ad_tier, ad_expires_at, is_verified);
CREATE INDEX idx_sites_user ON public.sites(user_id);

-- Site views
CREATE TABLE public.site_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_site_views_dedup ON public.site_views(site_id, viewer_id, created_at);
CREATE INDEX idx_site_views_site ON public.site_views(site_id);

-- Site upvotes
CREATE TABLE public.site_upvotes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);
CREATE INDEX idx_site_upvotes_site ON public.site_upvotes(site_id);

-- Site reviews
CREATE TABLE public.site_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);
CREATE INDEX idx_site_reviews_site ON public.site_reviews(site_id);

-- Site comments
CREATE TABLE public.site_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_site_comments_site ON public.site_comments(site_id);

-- Site followers
CREATE TABLE public.site_followers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);
CREATE INDEX idx_site_followers_site ON public.site_followers(site_id);

-- Bookmarks
CREATE TABLE public.bookmarks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);
CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id, site_id);

-- Transactions
CREATE TABLE public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  txn_id text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL,
  ref_id text,
  note text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_transactions_user ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_ref ON public.transactions(ref_id);

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  mc_username text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  balance_before numeric,
  balance_after numeric,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests(status);

-- Site reports
CREATE TABLE public.site_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Site announcements
CREATE TABLE public.site_announcements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_site_announcements ON public.site_announcements(site_id);

-- Ad requests
CREATE TABLE public.ad_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id),
  site_name text,
  tier text NOT NULL,
  price numeric NOT NULL,
  image_url text,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_ad_requests_status ON public.ad_requests(status);

-- Ads (legacy)
CREATE TABLE public.ads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text,
  description text,
  image_url text,
  link_url text,
  tier text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Site verification requests
CREATE TABLE public.site_verification_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id),
  site_name text,
  site_url text,
  description text,
  category text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_site_verification_status ON public.site_verification_requests(status);

-- Wiki pages
CREATE TABLE public.wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  content text,
  category text DEFAULT 'General',
  slug text UNIQUE,
  source text DEFAULT 'wiki',
  created_at timestamptz DEFAULT now()
);

-- Wiki comments
CREATE TABLE public.wiki_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wiki_page_id uuid REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_wiki_comments_page ON public.wiki_comments(wiki_page_id);

-- Departments
CREATE TABLE public.departments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  forum_url text,
  forum_category_id integer,
  created_at timestamptz DEFAULT now()
);

-- Collections
CREATE TABLE public.collections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_collections_user ON public.collections(user_id);

-- Search history
CREATE TABLE public.search_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_search_history_user ON public.search_history(user_id, created_at DESC);

-- Search analytics
CREATE TABLE public.search_analytics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query text NOT NULL,
  user_id uuid,
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_search_analytics_created ON public.search_analytics(created_at);

-- Achievements
CREATE TABLE public.user_achievements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  achievement_key text,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- Daily challenges
CREATE TABLE public.daily_challenges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date UNIQUE NOT NULL,
  target_count integer DEFAULT 5,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Challenge progress
CREATE TABLE public.challenge_progress (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id bigint NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id, site_id)
);

-- Business registrations
CREATE TABLE public.business_registrations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  owner_discord text,
  category text,
  plot_number text,
  shortcut text,
  discord_invite text,
  website_url text,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Staff logs
CREATE TABLE public.staff_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Staff payroll
CREATE TABLE public.staff_payroll (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date,
  actions_count integer DEFAULT 0,
  base_pay numeric DEFAULT 0,
  bonus_pay numeric DEFAULT 0,
  total_due numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Auto-deposit rules
CREATE TABLE public.auto_deposit_rules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_firm_name text NOT NULL,
  target_account_id text,
  percentage numeric DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Treasury tokens
CREATE TABLE public.treasury_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text,
  created_at timestamptz DEFAULT now()
);

-- Forum cache (for scraped forum data)
CREATE TABLE public.forum_cache (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type text NOT NULL,
  parent_id integer,
  title text,
  last_updated timestamptz DEFAULT now()
);

-- Listings (newer search system)
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text,
  target_url text,
  icon_url text,
  owner_name text,
  search_aliases text[] DEFAULT '{}',
  is_sponsored boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. NOTIFICATIONS & FORUMS (from add-features.sql)
-- ============================================================

CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

CREATE TABLE public.forum_categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.forum_threads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  last_post_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_forum_threads_cat ON public.forum_threads(category_id, last_post_at DESC);

CREATE TABLE public.forum_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_forum_posts_thread ON public.forum_posts(thread_id, created_at);

-- Contact messages
CREATE TABLE public.contact_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. AUTO-PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  fallback_name text;
BEGIN
  fallback_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'login',
    split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)
  );
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, fallback_name, COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'avatar'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, username, avatar_url)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'avatar')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;



-- ============================================================
-- 4. RPC FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS public.increment_balance(uuid, numeric, uuid, numeric);
DROP FUNCTION IF EXISTS public.increment_balance(uuid, numeric);
CREATE OR REPLACE FUNCTION public.increment_balance(target_user_id uuid DEFAULT NULL, deposit_amount numeric DEFAULT NULL, user_id uuid DEFAULT NULL, amount numeric DEFAULT NULL)
RETURNS void AS $$
DECLARE
  uid uuid;
  amt numeric;
BEGIN
  uid := COALESCE(target_user_id, user_id);
  amt := COALESCE(deposit_amount, amount);
  IF uid IS NULL OR amt IS NULL THEN RAISE EXCEPTION 'Missing user_id or amount'; END IF;
  INSERT INTO public.balances (user_id, balance)
  VALUES (uid, amt)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = balances.balance + amt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.grant_temp_admin(uuid, integer);
CREATE OR REPLACE FUNCTION public.grant_temp_admin(target_user_id uuid, duration_hours integer DEFAULT 24)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET is_staff = true WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. SEED DATA
-- ============================================================

INSERT INTO public.forum_categories (name, description, slug, sort_order) VALUES
  ('General Discussion', 'Chat about anything related to DemocracyCraft', 'general', 1),
  ('Site Reviews', 'Share and request reviews of sites', 'site-reviews', 2),
  ('Support', 'Get help with the directory platform', 'support', 3),
  ('Suggestions', 'Ideas for improving the directory', 'suggestions', 4),
  ('Showcase', 'Show off your site listing', 'showcase', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. ROW LEVEL SECURITY (from fix-rls.sql)
-- ============================================================

-- Wiki pages RLS
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert wiki_pages" ON public.wiki_pages
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon select wiki_pages" ON public.wiki_pages
  FOR SELECT TO anon
  USING (true);

-- Sites RLS — anon can read approved, authenticated can read all
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved sites" ON public.sites
  FOR SELECT TO anon
  USING (status = 'approved' AND is_active = true);

CREATE POLICY "Authenticated users can read all sites" ON public.sites
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own sites" ON public.sites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their sites" ON public.sites
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = owner_user_id OR auth.uid() = user_id);

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Balances RLS
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance" ON public.balances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages balances" ON public.balances
  FOR ALL TO service_role
  USING (true);

-- Site views RLS
ALTER TABLE public.site_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages views" ON public.site_views
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- DONE!
-- ============================================================
