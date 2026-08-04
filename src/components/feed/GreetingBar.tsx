import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';

interface GreetingBarProps {
  unreadNotifications: number;
  newFollowers: number;
}

export default function GreetingBar({ unreadNotifications, newFollowers }: GreetingBarProps) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'friend';

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-300">
      <p className="font-heading font-bold text-lg text-gray-900 dark:text-white">
        Namaste, {firstName}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {unreadNotifications > 0 && (
          <button
            onClick={() => navigate('/notifications')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400 text-xs font-semibold hover:bg-coral-100 dark:hover:bg-coral-900/30 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadNotifications} new in Pulse
          </button>
        )}
        {newFollowers > 0 && (
          <button
            onClick={() => navigate(`/u/${profile?.username}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {newFollowers} naye followers
          </button>
        )}
      </div>
    </div>
  );
}
