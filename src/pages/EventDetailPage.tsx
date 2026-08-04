import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Share2,
  CalendarPlus,
  Loader2,
  ArrowLeft,
  Check,
  Eye,
  X,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';
import type { EventItem, Profile } from '@/lib/types';
import {
  fetchEventById,
  setAttendance,
  fetchEventAttendees,
  generateICS,
} from '@/lib/eventsApi';

type AttendanceStatus = 'going' | 'interested' | 'not_going';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState<AttendanceStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [shared, setShared] = useState(false);

  usePageTitle(event?.title ? `${event.title} | Sangam` : 'Event | Sangam');

  useEffect(() => {
    if (!id) return;
    loadEvent();
  }, [id]);

  async function loadEvent() {
    if (!id) return;
    setLoading(true);
    try {
      const e = await fetchEventById(id, profile?.id);
      setEvent(e);
      setMyStatus((e?.my_status as AttendanceStatus | null) ?? null);
      const atts = await fetchEventAttendees(id);
      setAttendees(atts);
    } catch (err) {
      console.error('loadEvent error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetStatus(status: AttendanceStatus) {
    if (!id || !profile) return;
    setUpdating(true);
    const prev = myStatus;
    setMyStatus(status);
    try {
      await setAttendance(id, status);
      // Optimistically update counts
      if (event) {
        let delta = 0;
        if (status === 'going' && prev !== 'going') delta = 1;
        if (status !== 'going' && prev === 'going') delta = -1;
        if (delta !== 0) {
          setEvent({ ...event, going_count: Math.max(0, event.going_count + delta) });
        }
      }
      const atts = await fetchEventAttendees(id);
      setAttendees(atts);
    } catch (err) {
      console.error('setAttendance error', err);
      setMyStatus(prev);
    } finally {
      setUpdating(false);
    }
  }

  async function handleShare() {
    if (!event) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch (err) {
      // user cancelled share
    }
  }

  async function handleAddToCalendar() {
    if (!event) return;
    try {
      const ics = generateICS(event);
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('generateICS error', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
          Event not found
        </p>
        <button
          onClick={() => navigate('/events')}
          className="mt-4 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Back */}
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Events
      </button>

      {/* Cover */}
      <div className="rounded-2xl overflow-hidden mb-4 h-48 bg-gray-100 dark:bg-navy-300">
        {event.cover_url ? (
          <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
            <CalendarDays className="h-16 w-16 text-white/70" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">
        {event.title}
      </h1>
      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-coral-500" />
          {eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        {event.event_time && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-coral-500" />
            {event.event_time}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
        {event.is_online ? (
          <span className="flex items-center gap-1.5">
            <Video className="h-4 w-4 text-coral-500" />
            Online Event
          </span>
        ) : (
          event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-coral-500" />
              {event.location}
            </span>
          )
        )}
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-coral-500" />
          {formatCount(event.going_count)} going
        </span>
      </div>

      {/* Attendance buttons */}
      {profile && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => handleSetStatus('going')}
            disabled={updating}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform ${
              myStatus === 'going'
                ? 'bg-sangam-gradient text-white'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            <Check className="h-4 w-4" />
            Going
          </button>
          <button
            onClick={() => handleSetStatus('interested')}
            disabled={updating}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform ${
              myStatus === 'interested'
                ? 'bg-sangam-gradient text-white'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            <Eye className="h-4 w-4" />
            Interested
          </button>
          <button
            onClick={() => handleSetStatus('not_going')}
            disabled={updating}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform ${
              myStatus === 'not_going'
                ? 'bg-sangam-gradient text-white'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            <X className="h-4 w-4" />
            Not Going
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleAddToCalendar}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-navy-200 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-navy-300 text-sm font-bold active:scale-95 transition-transform"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to Calendar
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-navy-200 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-navy-300 text-sm font-bold active:scale-95 transition-transform"
        >
          {shared ? <Check className="h-4 w-4 text-brand-500" /> : <Share2 className="h-4 w-4" />}
          {shared ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Description */}
      {event.description && (
        <div className="mt-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-2">
            About this event
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
      )}

      {/* Attendees */}
      <div className="mt-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">
          Who's going ({attendees.length})
        </h2>
        {attendees.length === 0 ? (
          <p className="text-sm text-gray-400">No one has RSVP'd yet. Be the first!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {attendees.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate(`/profile/${a.username}`)}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300">
                  {a.avatar_url ? (
                    <img
                      src={a.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {(a.full_name || a.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[60px]">
                  {a.username}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
