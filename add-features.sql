-- Run this in Supabase Dashboard -> SQL Editor

-- Drop old forum tables if they exist (different schema)
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS forum_threads CASCADE;
DROP TABLE IF EXISTS forum_categories CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 1. Notifications table
CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- 2. Forum tables
CREATE TABLE forum_categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE forum_threads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  last_post_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_threads_cat ON forum_threads(category_id, last_post_at DESC);

CREATE TABLE forum_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id, created_at);

-- 3. Seed forum categories
INSERT INTO forum_categories (name, description, slug, sort_order) VALUES
  ('General Discussion', 'Chat about anything related to DemocracyCraft', 'general', 1),
  ('Site Reviews', 'Share and request reviews of sites', 'site-reviews', 2),
  ('Support', 'Get help with the directory platform', 'support', 3),
  ('Suggestions', 'Ideas for improving the directory', 'suggestions', 4),
  ('Showcase', 'Show off your site listing', 'showcase', 5)
ON CONFLICT (slug) DO NOTHING;
