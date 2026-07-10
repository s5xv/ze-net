-- Fix all wiki page URLs to remove /wiki/ prefix
UPDATE public.wiki_pages 
SET url = 'https://wiki.democracycraft.net/' || REPLACE(title, ' ', '_')
WHERE category != 'Category';

-- Fix category URLs
UPDATE public.wiki_pages 
SET url = 'https://wiki.democracycraft.net/Category:' || REPLACE(title, ' ', '_')
WHERE category = 'Category';

-- Show the fixed URLs
SELECT title, url FROM public.wiki_pages LIMIT 10;
