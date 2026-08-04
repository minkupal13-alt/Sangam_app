import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Video } from '@/lib/types';
import { formatCount, timeAgo } from '@/lib/format';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const author = video.author;

  return (
    <div
      className="cursor-pointer group"
      onClick={() => navigate(`/watch/${video.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-200 dark:bg-navy-300">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            {t('watch.noVideos')}
          </div>
        )}
        {video.duration_seconds > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {formatDuration(video.duration_seconds)}
          </span>
        )}
      </div>

      {/* Info row */}
      <div className="flex gap-3 mt-3">
        <img
          src={author?.avatar_url || `https://ui-avatars.com/api/?name=${author?.full_name || 'U'}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/u/${author?.username}`);
          }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug">
            {video.title}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            {author?.full_name || 'Unknown'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {formatCount(video.views_count)} {t('watch.views')} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
