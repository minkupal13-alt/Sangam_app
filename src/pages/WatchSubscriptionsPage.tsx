import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { Video, Profile } from '@/lib/types';
import { fetchSubscriptionFeed, fetchSubscribedChannels } from '@/lib/watchApi';
import VideoCard from '@/components/VideoCard';
import { usePageTitle } from '@/lib/usePageTitle';

export default function WatchSubscriptionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(`${t('watch.subscriptions')} | Sangam Watch`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vids, chans] = await Promise.all([
        fetchSubscriptionFeed(),
        fetchSubscribedChannels(),
      ]);
      setVideos(vids);
      setChannels(chans);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mb-4">
        {t('watch.subscriptions')}
      </h1>

      {/* Channel avatars row */}
      {channels.length > 0 && (
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-6 pb-2">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => navigate(`/u/${ch.username}`)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <img
                src={ch.avatar_url || `https://ui-avatars.com/api/?name=${ch.full_name || 'U'}`}
                alt=""
                className="h-14 w-14 rounded-full object-cover border-2 border-transparent hover:border-brand-500 transition-colors"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[60px] truncate">
                {ch.full_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 font-heading font-bold text-lg">{t('watch.noSubscriptions')}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 font-heading font-bold text-lg">{t('watch.allCaughtUp')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
