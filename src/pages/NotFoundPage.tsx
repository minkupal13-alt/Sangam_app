import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import SangamLogo from '@/components/SangamLogo';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <SangamLogo size={64} />
      <h1 className="font-heading font-extrabold text-6xl mt-6 bg-sangam-gradient text-transparent bg-clip-text">
        404
      </h1>
      <p className="text-gray-900 dark:text-white font-heading font-bold text-xl mt-4">
        यह page मौजूद नहीं है
      </p>
      <p className="text-gray-400 text-sm mt-2 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-full bg-sangam-gradient text-white font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-md shadow-coral-500/20"
        >
          <Home className="h-4 w-4" /> घर वापस जाएं
        </button>
        <button
          onClick={() => navigate('/explore')}
          className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-navy-200 text-gray-600 dark:text-gray-300 font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Search className="h-4 w-4" /> Explore
        </button>
      </div>
    </div>
  );
}
