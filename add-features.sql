-- Comments on sites
CREATE TABLE IF NOT EXISTS public.site_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews for sites (1-5 stars)
CREATE TABLE IF NOT EXISTS public.site_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, user_id)
);

-- Upvotes for sites
CREATE TABLE IF NOT EXISTS public.site_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, user_id)
);

-- Upvotes for wiki pages
CREATE TABLE IF NOT EXISTS public.wiki_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiki_page_id UUID REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wiki_page_id, user_id)
);

-- Site ownership
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS owner_discord_id TEXT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS owner_mc_name TEXT;

-- Site managers can post announcements
CREATE TABLE IF NOT EXISTS public.site_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- User profiles
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS mc_username TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Enable RLS
ALTER TABLE public.site_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view comments" ON public.site_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can insert comments" ON public.site_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.site_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.site_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reviews" ON public.site_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can insert reviews" ON public.site_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.site_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.site_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view upvotes" ON public.site_upvotes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can upvote" ON public.site_upvotes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view wiki upvotes" ON public.wiki_upvotes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can upvote wiki" ON public.wiki_upvotes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view announcements" ON public.site_announcements FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Site owners can manage announcements" ON public.site_announcements FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = site_announcements.site_id 
    AND (sites.owner_discord_id = (SELECT user_metadata->>'sub' FROM auth.users WHERE id = auth.uid()) 
         OR sites.owner_mc_name IS NOT NULL)
  )
) WITH CHECK (true);

-- Function to auto-assign ownership when user signs up
CREATE OR REPLACE FUNCTION public.assign_site_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user's Discord ID or MC name matches any site owner
  UPDATE public.sites 
  SET owner_discord_id = NEW.user_metadata->>'sub'
  WHERE owner_discord_id = NEW.user_metadata->>'sub' 
  AND owner_discord_id IS NOT NULL;
  
  UPDATE public.sites 
  SET owner_discord_id = NEW.id
  WHERE LOWER(owner_mc_name) = LOWER(NEW.user_metadata->>'name')
  AND owner_mc_name IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signups
DROP TRIGGER IF EXISTS on_user_signup ON auth.users;
CREATE TRIGGER on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_site_ownership();
