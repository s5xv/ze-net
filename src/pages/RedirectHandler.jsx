import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import NotFound from './NotFound';

export default function RedirectHandler() {
  const { slug } = useParams();
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      // Query Supabase for the exact slug match
      const { data, error } = await supabase
        .from('listings')
        .select('target_url')
        .eq('slug', slug)
        .single();

      // If there's an error (e.g., no rows found) or no target_url, show 404
      if (error || !data || !data.target_url) {
        setIsNotFound(true);
      } else {
        // Fast client-side redirect
        window.location.href = data.target_url;
      }
    };
    
    handleRedirect();
  }, [slug]);

  // Render 404 component if the slug wasn't found in the database
  if (isNotFound) {
    return <NotFound />;
  }

  // Show a brief loading state while the redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-lg">Redirecting to <span className="font-mono font-bold text-gray-800">/{slug}</span>...</p>
      </div>
    </div>
  );
}
