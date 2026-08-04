import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Bell } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendee_count: number;
  cover_url: string | null;
}

interface EventsWidgetProps {
  events: EventItem[];
  loading: boolean;
}

export default function EventsWidget({ events, loading }: EventsWidgetProps) {
  const navigate = useNavigate();

  if (!loading && events.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-emerald-50/20 dark:bg-emerald-900/5 border-y border-emerald-100/50 dark:border-emerald-900/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
            Upcoming Events
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
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-56 h-28 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex-shrink-0 w-56 rounded-xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/explore')}
            >
              <div className="h-16 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center relative">
                {event.cover_url ? (
                  <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CalendarDays className="h-6 w-6 text-emerald-500" />
                )}
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold">
                  {event.date}
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                  <Clock className="h-2.5 w-2.5" /> {event.time}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <MapPin className="h-2.5 w-2.5" /> {event.location}
                </div>
                <button className="mt-2 w-full py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                  <Bell className="h-2.5 w-2.5" /> Remind Me
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
