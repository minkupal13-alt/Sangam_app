import { useNavigate } from 'react-router-dom';
import { Play, Eye } from 'lucide-react';
import type { Flick } from '@/lib/types';
import { formatCount } from '@/lib/format';

interface FlicksRowProps {
  flicks: Flick[];
  loading: boolean;
}

export default function FlicksRow({ flicks, loading }: FlicksRowProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-3 bg-gradient-to-b from-navy-200/30 to-transparent dark:from-navy-300/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
          Flicks for You
        </h2>
        <button
          onClick={() => navigate('/flicks')}
          className="text-xs font-semibold text-brand-500 hover:underline"
        >
          See All
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-28 aspect-[9/16] rounded-xl skeleton" />
          ))}
        </div>
      ) : flicks.length === 0 ? null : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {flicks.map((flick) => (
            <button
              key={flick.id}
              onClick={() => navigate('/flicks')}
              className="flex-shrink-0 w-28 aspect-[9/16] rounded-xl overflow-hidden relative group bg-gray-200 dark:bg-navy-300"
            >
              {flick.thumbnail_url ? (
                <img
                  src={flick.thumbnail_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-6 w-6 text-gray-400" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* Views count */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[10px] font-semibold">
                <Eye className="h-3 w-3" />
                {formatCount(flick.views_count)}
              </div>
              {/* Creator avatar */}
              <img
                src={flick.author?.avatar_url || `https://ui-avatars.com/api/?name=${flick.author?.full_name || 'U'}`}
                alt=""
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full object-cover border border-white/50"
              />
              {/* Play icon center */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-4 w-4 text-white fill-white" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
