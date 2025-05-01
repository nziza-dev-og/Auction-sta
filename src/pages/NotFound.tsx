import  { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-3 text-xl text-gray-600">Page not found</p>
      <p className="mt-4 text-gray-500 max-w-md text-center">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="mt-8 btn btn-primary inline-flex items-center">
        <Home className="h-5 w-5 mr-2" />
        Back to Home
      </Link>
    </div>
  );
}
 