import { useNavigate } from 'react-router-dom';
import { Mic, Users, Headphones } from 'lucide-react';

interface LiveRoom {
  id: string;
  title: string;
  host_name: string;
  host_avatar: string | null;
  listener_count: number;
  topic: string;
}

interface LiveRoomsWidgetProps {
  rooms: LiveRoom[];
  loading: boolean;
}

export default function LiveRoomsWidget({ rooms, loading }: LiveRoomsWidgetProps) {
  const navigate = useNavigate();

  if (!loading && rooms.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-purple-50/30 to-brand-50/20 dark:from-purple-900/5 dark:to-brand-900/5 border-y border-purple-100/50 dark:border-purple-900/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-400 to-brand-500 flex items-center justify-center">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
            Live Audio Rooms
          </h2>
        </div>
        <button
          onClick={() => navigate('/explore')}
          className="text-xs font-semibold text-brand-500 hover:underline"
        >
          See All
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 h-24 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex-shrink-0 w-52 h-24 rounded-xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/explore')}
            >
              <div className="flex items-center gap-2">
                <img
                  src={room.host_avatar || `https://ui-avatars.com/api/?name=${room.host_name}`}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {room.title}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{room.host_name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-500 font-semibold flex items-center gap-1">
                  <Headphones className="h-3 w-3" /> {room.topic}
                </span>
                <button className="px-2.5 py-1 rounded-full bg-sangam-gradient text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform">
                  <Users className="h-2.5 w-2.5" /> Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
