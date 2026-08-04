import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Plus, Loader2, X, Users, Mic, Calendar } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';
import { fetchActiveRooms, createRoom } from '@/lib/audioRoomApi';
import type { AudioRoom } from '@/lib/types';

export default function AudioRoomsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', topic: '', scheduled_at: '' });

  usePageTitle('Audio Rooms | Sangam');

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await fetchActiveRooms();
      setRooms(data as AudioRoom[]);
    } catch (err) {
      console.error('loadRooms error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const room = await createRoom(
        form.title.trim(),
        form.topic.trim() || '',
        form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      );
      setShowCreate(false);
      setForm({ title: '', topic: '', scheduled_at: '' });
      if (room?.id) {
        navigate(`/audio-rooms/${room.id}`);
      } else {
        loadRooms();
      }
    } catch (err) {
      console.error('createRoom error', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Headphones className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Audio Rooms
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Room</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <Headphones className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
            No active rooms
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Start a conversation by creating a new audio room.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Host avatar */}
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300">
                    {room.author?.avatar_url ? (
                      <img
                        src={room.author.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                        <Mic className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  {room.status === 'live' && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white dark:border-navy-200" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white truncate">
                    {room.title}
                  </h3>
                  {room.topic && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {room.topic}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {formatCount(room.listener_count)} listening
                    </span>
                    <span className="text-gray-400">
                      by @{room.author?.username || 'host'}
                    </span>
                    {room.scheduled_at && room.status !== 'live' && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(room.scheduled_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    {room.status === 'live' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold">
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={() => navigate(`/audio-rooms/${room.id}`)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Room Modal */}
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
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">New Audio Room</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Room Title
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Friday Night Chats"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Topic
                </label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="Technology, music, life..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank to start the room immediately.
                </p>
              </div>
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
                  'Create Room'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
