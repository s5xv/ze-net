-- Add shortcuts column to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS shortcuts TEXT[] DEFAULT '{}';

-- Add more categories
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_category_check;
ALTER TABLE public.sites ADD CONSTRAINT sites_category_check 
  CHECK (category IN (
    'Government', 'Corporate', 'Service', 'Charity', 'Community', 
    'Business', 'Build Project', 'Event', 'Politics', 'Creative', 
    'Emergency', 'Other', 'Bank', 'Shop', 'Restaurant', 'Hotel',
    'Entertainment', 'Education', 'Health', 'Transport', 'Technology',
    'Media', 'Sports', 'Gaming', 'Social', 'News', 'Forum', 'Wiki',
    'Discord', 'Player', 'Organization', 'Guild', 'Faction'
  ));
