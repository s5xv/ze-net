import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const slug = url.searchParams.get('slug') || url.pathname.replace('/site/', '').replace('/embed', '').replace(/^\/+|\/+$/g, '');

  if (!slug) {
    return res.status(200).setHeader('Content-Type', 'text/html').end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Z&E Net</title><meta name="robots" content="noindex"></head><body>Embed not found</body></html>`);
  }

  try {
    const { data: site } = await supabase.from('sites').select('name, description, image_url, category, slug, is_verified').eq('slug', slug).maybeSingle();

    if (!site) {
      return res.status(200).setHeader('Content-Type', 'text/html').end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Site not found — Z&E Net</title><meta property="og:title" content="Site not found"><meta property="og:description" content="No site found with that slug."><meta name="robots" content="noindex"></head><body>Site not found</body></html>`);
    }

    const title = `${esc(site.name)} — Z&E Net Directory`;
    const desc = esc(site.description?.slice(0, 300)) || `${esc(site.category)} listing on DemocracyCraft`;
    const image = site.image_url || 'https://ze-net-beryl.vercel.app/default-og.png';
    const siteUrl = `https://ze-net-beryl.vercel.app/site/${site.slug}`;

    res.status(200).setHeader('Content-Type', 'text/html').end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="robots" content="noindex">
  <meta property="og:title" content="${esc(site.name)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${siteUrl}">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#2563eb">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(site.name)}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">
  <style>
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #303134; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #202124; border-radius: 12px; padding: 24px; max-width: 360; text-align: center; border: 1px solid #3c4043; }
    img { border-radius: 8px; max-width: 100%; height: auto; }
    .name { font-size: 18px; font-weight: bold; margin: 12px 0 4px; }
    .cat { color: #9aa0a6; font-size: 12px; text-transform: capitalize; }
    .desc { color: #bdc1c6; font-size: 13px; line-height: 1.4; margin: 8px 0; }
    .btn { display: inline-block; margin-top: 12px; padding: 8px 16px; background: #8ab4f8; color: #202124; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    ${image ? `<img src="${image}" alt="${esc(site.name)}" />` : ''}
    <div class="name">${esc(site.name)}${site.is_verified ? ' ✓' : ''}</div>
    <div class="cat">${esc(site.category)}</div>
    ${site.description ? `<div class="desc">${desc}</div>` : ''}
    <a class="btn" href="${siteUrl}" target="_blank">View on Z&E Net</a>
  </div>
</body>
</html>`);
  } catch (err) {
    res.status(200).setHeader('Content-Type', 'text/html').end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error — Z&E Net</title></head><body>Error loading embed</body></html>`);
  }
}
