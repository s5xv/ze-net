import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-8xl font-bold text-gray-200">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mt-4">Page Not Found</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        The short-link you are looking for does not exist, has been moved, or the DemocracyCraft server is currently offline.
      </p>
      <Link 
        to="/" 
        className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
      >
        Return to Homepage
      </Link>
    </div>
  );
}
