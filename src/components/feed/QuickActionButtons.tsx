import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenSquare, Radio, Camera, BarChart3, MapPin } from 'lucide-react';

interface QuickActionButtonsProps {
  onCreatePost: () => void;
  onAddStory: () => void;
}

export default function QuickActionButtons({ onCreatePost, onAddStory }: QuickActionButtonsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    { label: t('feed.createPost'), icon: <PenSquare className="h-4 w-4" />, gradient: 'from-brand-400 to-brand-600', onClick: onCreatePost },
    { label: t('feed.goLive'), icon: <Radio className="h-4 w-4" />, gradient: 'from-red-400 to-red-600', onClick: () => navigate('/live') },
    { label: t('feed.addMoment'), icon: <Camera className="h-4 w-4" />, gradient: 'from-coral-400 to-coral-600', onClick: onAddStory },
    { label: t('feed.createPoll'), icon: <BarChart3 className="h-4 w-4" />, gradient: 'from-amber-400 to-amber-600', onClick: onCreatePost },
    { label: t('feed.createEvent'), icon: <MapPin className="h-4 w-4" />, gradient: 'from-emerald-400 to-emerald-600', onClick: () => navigate('/events') },
  ];

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-300">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex-shrink-0 flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className={`h-7 w-7 rounded-full bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white`}>
              {action.icon}
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
