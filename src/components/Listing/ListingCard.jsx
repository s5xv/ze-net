import { Link } from 'react-router-dom';
import { Badge } from '../UI';
import { SITE_CONFIG } from '../../utils/constants';

export default function ListingCard({ listing }) {
  const { 
    name, 
    description, 
    category, 
    target_url, 
    slug,
    icon_url,
    owner_name,
    is_sponsored,
    is_verified 
  } = listing;

  return (
    <article 
      className={`p-6 rounded-xl border transition-all duration-200 hover:translate-y-[-2px] ${
        is_sponsored 
          ? 'bg-gray-900 border-amber-500/30 shadow-lg shadow-amber-900/10' 
          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {icon_url ? (
            <img 
              src={icon_url} 
              alt={name} 
              className="w-12 h-12 rounded-lg bg-gray-800 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xl">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white truncate">
                {name}
              </h3>
              {is_verified && (
                <Badge variant="verified">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono truncate">
              {target_url || `${SITE_CONFIG.name}/${slug}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {is_sponsored && (
            <Badge variant="sponsored">Sponsored</Badge>
          )}
          <Badge variant="category">{category}</Badge>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
        {description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="text-xs text-gray-600">
          <span className="text-gray-500">Owner:</span>{' '}
          <span className="text-gray-400 font-medium">
            {owner_name || 'Unknown'}
          </span>
        </div>
        
        <Link 
          to={`/${slug}`}
          className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full hover:bg-blue-600/20 transition-colors text-sm font-medium"
        >
          Visit Link
        </Link>
      </div>
    </article>
  );
}
