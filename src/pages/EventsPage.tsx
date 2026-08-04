import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Loader2,
  X,
  MapPin,
  Users,
  Clock,
  Video,
  CalendarHeart,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';
import { fetchEvents, createEvent } from '@/lib/eventsApi';
import type { EventItem } from '@/lib/types';

export default function EventsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    is_online: false,
  });

  usePageTitle('Events | Sangam');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data as EventItem[]);
    } catch (err) {
      console.error('loadEvents error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.event_date) return;
    setCreating(true);
    try {
      const event = await createEvent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        event_date: form.event_date,
        event_time: form.event_time || '00:00',
        location: form.location.trim() || (form.is_online ? 'Online' : 'TBD'),
        is_online: form.is_online,
      });
      setShowCreate(false);
      setForm({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        location: '',
        is_online: false,
      });
      if (event?.id) {
        navigate(`/events/${event.id}`);
      } else {
        loadEvents();
      }
    } catch (err) {
      console.error('createEvent error', err);
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Event</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <CalendarHeart className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
            No events yet
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Create an event and invite your community.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            >
              {/* Cover */}
              <div className="h-32 w-full bg-gray-100 dark:bg-navy-300 relative">
                {event.cover_url ? (
                  <img
                    src={event.cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                    <CalendarDays className="h-10 w-10 text-white/70" />
                  </div>
                )}
                {/* Date badge */}
                <div className="absolute top-2 left-2 rounded-xl bg-white dark:bg-navy-200 shadow-sm px-2.5 py-1.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-coral-500">
                    {new Date(event.event_date).toLocaleString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-lg font-heading font-extrabold text-gray-900 dark:text-white leading-none">
                    {new Date(event.event_date).getDate()}
                  </p>
                </div>
                {event.is_online && (
                  <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Online
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(event.event_date)}
                  </span>
                  {event.event_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.event_time}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  {event.location ? (
                    <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Users className="h-3 w-3" />
                    {formatCount(event.going_count)} going
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
              <button
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">Create Event</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Community Meetup"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="What's this event about?"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    required
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="City, Venue or link"
                  disabled={form.is_online}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors disabled:opacity-50"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_online}
                  onChange={(e) => setForm({ ...form, is_online: e.target.checked })}
                  className="h-4 w-4 rounded accent-coral-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Video className="h-4 w-4" />
                  This is an online event
                </span>
              </label>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
