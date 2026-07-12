-- Run this in Supabase Dashboard -> SQL Editor (the ENTIRE file)

SET search_path TO public;

-- Drop old forum tables if they exist (different schema)
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 1. Notifications table
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
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- 2. Forum tables
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
CREATE INDEX IF NOT EXISTS idx_forum_threads_cat ON public.forum_threads(category_id, last_post_at DESC);

CREATE TABLE public.forum_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.forum_posts(thread_id, created_at);

-- 3. Add status column to sites for approval workflow
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- 4. Achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- Add XP column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;

-- 5. Seed forum categories
INSERT INTO public.forum_categories (name, description, slug, sort_order) VALUES
  ('General Discussion', 'Chat about anything related to DemocracyCraft', 'general', 1),
  ('Site Reviews', 'Share and request reviews of sites', 'site-reviews', 2),
  ('Support', 'Get help with the directory platform', 'support', 3),
  ('Suggestions', 'Ideas for improving the directory', 'suggestions', 4),
  ('Showcase', 'Show off your site listing', 'showcase', 5)
ON CONFLICT (slug) DO NOTHING;
