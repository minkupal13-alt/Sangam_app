import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Video } from '@/lib/types';
import { formatCount, timeAgo } from '@/lib/format';

interface TrendingOnWatchProps {
  videos: Video[];
  loading: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TrendingOnWatch({ videos, loading }: TrendingOnWatchProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
          Trending on Watch
        </h2>
        <button
          onClick={() => navigate('/watch')}
          className="text-xs font-semibold text-brand-500 hover:underline"
        >
          See All
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-36 rounded-xl skeleton" />
          ))}
        </div>
      ) : videos.length === 0 ? null : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {videos.map((video) => (
            <div
              key={video.id}
              onClick={() => navigate(`/watch/${video.id}`)}
              className="flex-shrink-0 w-64 cursor-pointer group"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-navy-300">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : null}
                {video.duration_seconds > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2 line-clamp-2 leading-snug">
                {video.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {video.author?.full_name}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatCount(video.views_count)} views · {timeAgo(video.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
