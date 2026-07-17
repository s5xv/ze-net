import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function SiteEmbed() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.from('sites').select('name, description, image_url, category, slug, is_verified').eq('slug', slug).maybeSingle()
      .then(({ data, error: err }) => { if (err || !data) setError(true); else setSite(data); });
  }, [slug]);

  if (error) return <div style={{padding: 16, fontFamily: 'sans-serif', color: '#999'}}>Site not found</div>;
  if (!site) return <div style={{padding: 16, fontFamily: 'sans-serif', color: '#999'}}>Loading...</div>;

  return (
    <div style={{
      background: '#303134', border: '1px solid #3c4043', borderRadius: 12, padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 360
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
        {site.image_url && <img src={site.image_url} alt="" style={{width: 40, height: 40, borderRadius: 8, objectFit: 'cover'}} />}
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>{site.name}</span>
            {site.is_verified && <span style={{background: '#2563eb', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 99}}>VERIFIED</span>}
          </div>
          <span style={{color: '#9aa0a6', fontSize: 12, textTransform: 'capitalize'}}>{site.category}</span>
        </div>
      </div>
      <p style={{color: '#bdc1c6', fontSize: 13, lineHeight: 1.4, margin: 0}}>{site.description}</p>
      <a href={`https://ze-net-beryl.vercel.app/site/${site.slug}`} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-block', marginTop: 10, padding: '8px 16px', background: '#8ab4f8', color: '#202124',
        borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600
      }}>View on Z&E Net</a>
    </div>
  );
}
