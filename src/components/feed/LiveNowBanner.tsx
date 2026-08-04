import { useNavigate } from 'react-router-dom';
import { Radio, Eye } from 'lucide-react';

interface LiveCreator {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  viewer_count: number;
  stream_title: string;
}

interface LiveNowBannerProps {
  liveStreams: LiveCreator[];
  loading: boolean;
}

export default function LiveNowBanner({ liveStreams, loading }: LiveNowBannerProps) {
  const navigate = useNavigate();

  if (!loading && liveStreams.length === 0) return null;

  return (
    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-navy-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Live Now</h2>
      </div>
      {loading ? (
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-56 h-16 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {liveStreams.map((stream) => (
            <button
              key={stream.id}
              onClick={() => navigate(`/watch/${stream.id}`)}
              className="flex-shrink-0 w-56 h-16 rounded-xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-2 flex items-center gap-2.5 hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <div className="relative">
                <img
                  src={stream.avatar_url || `https://ui-avatars.com/api/?name=${stream.full_name}`}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold flex items-center gap-0.5">
                  <Radio className="h-2.5 w-2.5" /> LIVE
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {stream.stream_title}
                </p>
                <p className="text-[11px] text-gray-400 truncate">{stream.full_name}</p>
                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-0.5">
                  <Eye className="h-2.5 w-2.5" /> {stream.viewer_count} watching
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
