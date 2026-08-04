import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Hand,
  LogOut,
  X,
  Loader2,
  Crown,
  Volume2,
  VolumeX,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import type { AudioRoom, RoomParticipant } from '@/lib/types';
import {
  fetchRoomById,
  fetchRoomParticipants,
  joinRoom,
  leaveRoom,
  toggleMute,
  raiseHand,
  endRoom,
  subscribeToRoomParticipants,
} from '@/lib/audioRoomApi';

export default function AudioRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [room, setRoom] = useState<AudioRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const subRef = useRef<ReturnType<typeof subscribeToRoomParticipants> | null>(null);

  usePageTitle(room?.title ? `${room.title} | Sangam` : 'Audio Room | Sangam');

  useEffect(() => {
    if (!id) return;
    loadRoom();
    return () => {
      if (subRef.current) subRef.current.unsubscribe();
      if (joined && id) {
        leaveRoom(id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadRoom() {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetchRoomById(id);
      if (!r) {
        setError('Room not found');
        return;
      }
      setRoom(r);
      const parts = await fetchRoomParticipants(id);
      setParticipants(parts);
      await joinRoom(id);
      setJoined(true);
      const sub = subscribeToRoomParticipants(id, (updated) => {
        setParticipants(updated);
      });
      subRef.current = sub;
    } catch (err) {
      console.error('loadRoom error', err);
      setError('Failed to load room');
    } finally {
      setLoading(false);
    }
  }

  const me = participants.find((p) => p.user_id === profile?.id);
  const isHost = me?.role === 'host' || room?.user_id === profile?.id;
  const speakers = participants.filter((p) => p.role === 'host' || p.role === 'speaker');
  const listeners = participants.filter((p) => p.role === 'listener');
  const raisedHands = listeners.filter((p) => p.hand_raised);

  async function handleToggleMute() {
    if (!id || !me) return;
    setActionLoading(true);
    try {
      await toggleMute(id, me.is_muted);
    } catch (err) {
      console.error('toggleMute error', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRaiseHand() {
    if (!id || !me) return;
    setActionLoading(true);
    try {
      await raiseHand(id, !me.hand_raised);
    } catch (err) {
      console.error('raiseHand error', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!id) return;
    try {
      await leaveRoom(id);
    } catch (err) {
      console.error('leaveRoom error', err);
    }
    if (subRef.current) subRef.current.unsubscribe();
    navigate('/audio-rooms');
  }

  async function handleEndRoom() {
    if (!id) return;
    if (!confirm('End this room for everyone?')) return;
    setActionLoading(true);
    try {
      await endRoom(id);
      if (subRef.current) subRef.current.unsubscribe();
      navigate('/audio-rooms');
    } catch (err) {
      console.error('endRoom error', err);
      setActionLoading(false);
    }
  }

  async function handleInviteSpeaker(p: RoomParticipant) {
    if (!id) return;
    // Toggle speaker status via toggleMute-like API; reuse raiseHand acceptance
    try {
      await toggleMute(id, p.is_muted);
      // The API may promote to speaker; refresh handled by subscription
    } catch (err) {
      console.error('inviteSpeaker error', err);
    }
  }

  async function handleMuteParticipant(p: RoomParticipant) {
    if (!id) return;
    try {
      await toggleMute(id, p.is_muted);
    } catch (err) {
      console.error('muteParticipant error', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-navy-100">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-navy-100 px-4 text-center">
        <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
          {error || 'Room unavailable'}
        </p>
        <button
          onClick={() => navigate('/audio-rooms')}
          className="mt-4 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-100 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-navy-200 border-b border-gray-100 dark:border-navy-300 flex items-center gap-3">
        <button
          onClick={handleLeave}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate">
            {room.title}
          </h1>
          {room.topic && (
            <p className="text-xs text-gray-400 truncate">{room.topic}</p>
          )}
        </div>
        {room.status === 'live' && (
          <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Speakers */}
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
          Speakers
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
          {speakers.map((p) => (
            <div key={p.id} className="flex flex-col items-center text-center group">
              <div className="relative">
                <div
                  className={`h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300 ring-4 transition-all ${
                    p.is_muted
                      ? 'ring-gray-200 dark:ring-navy-300'
                      : 'ring-brand-500/30'
                  }`}
                >
                  {p.profile?.avatar_url ? (
                    <img
                      src={p.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                      <Mic className="h-7 w-7 text-white" />
                    </div>
                  )}
                </div>
                {/* Badges */}
                {p.role === 'host' && (
                  <span className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center border-2 border-white dark:border-navy-200">
                    <Crown className="h-3 w-3 text-white" />
                  </span>
                )}
                {p.is_muted ? (
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white dark:border-navy-200">
                    <MicOff className="h-3 w-3 text-white" />
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-brand-500 flex items-center justify-center border-2 border-white dark:border-navy-200">
                    <Mic className="h-3 w-3 text-white" />
                  </span>
                )}
                {/* Host controls */}
                {isHost && p.user_id !== profile?.id && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleMuteParticipant(p)}
                      className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center"
                      title={p.is_muted ? 'Unmute' : 'Mute'}
                    >
                      {p.is_muted ? (
                        <Volume2 className="h-3.5 w-3.5 text-gray-700" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5 text-gray-700" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2 truncate max-w-full">
                {p.profile?.full_name || p.profile?.username || 'Speaker'}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-full">
                @{p.profile?.username || 'user'}
              </p>
            </div>
          ))}
        </div>

        {/* Raised hands */}
        {raisedHands.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-coral-500 mb-3 flex items-center gap-1">
              <Hand className="h-3 w-3" />
              Requesting to speak ({raisedHands.length})
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
              {raisedHands.map((p) => (
                <div key={p.id} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300 ring-2 ring-coral-500/50">
                      {p.profile?.avatar_url ? (
                        <img
                          src={p.profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                          <Mic className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-coral-500 flex items-center justify-center border-2 border-white dark:border-navy-200">
                      <Hand className="h-2.5 w-2.5 text-white" />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">
                    @{p.profile?.username || 'user'}
                  </p>
                  {isHost && (
                    <button
                      onClick={() => handleInviteSpeaker(p)}
                      className="mt-1 px-2 py-0.5 rounded-full bg-sangam-gradient text-white text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <UserPlus className="h-2.5 w-2.5" />
                      Invite
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Listeners */}
        {listeners.filter((p) => !p.hand_raised).length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
              Listeners ({listeners.filter((p) => !p.hand_raised).length})
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
              {listeners
                .filter((p) => !p.hand_raised)
                .map((p) => (
                  <div key={p.id} className="flex flex-col items-center text-center">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300">
                      {p.profile?.avatar_url ? (
                        <img
                          src={p.profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                          <Mic className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-full">
                      @{p.profile?.username || 'user'}
                    </p>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-4 bg-white dark:bg-navy-200 border-t border-gray-100 dark:border-navy-300 flex items-center justify-center gap-3">
        {me && (me.role === 'host' || me.role === 'speaker') && (
          <button
            onClick={handleToggleMute}
            disabled={actionLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform ${
              me.is_muted
                ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                : 'bg-sangam-gradient text-white'
            }`}
          >
            {me.is_muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {me.is_muted ? 'Unmute' : 'Mute'}
          </button>
        )}
        {me?.role === 'listener' && !me.hand_raised && (
          <button
            onClick={handleRaiseHand}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400 text-sm font-bold active:scale-95 transition-transform"
          >
            <Hand className="h-4 w-4" />
            Raise Hand
          </button>
        )}
        {me?.role === 'listener' && me.hand_raised && (
          <span className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400 text-sm font-bold">
            <Hand className="h-4 w-4" />
            Hand Raised
          </span>
        )}
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300 text-sm font-bold active:scale-95 transition-transform"
        >
          <LogOut className="h-4 w-4" />
          Leave
        </button>
        {isHost && (
          <button
            onClick={handleEndRoom}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 text-white text-sm font-bold active:scale-95 transition-transform"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            End Room
          </button>
        )}
      </div>
    </div>
  );
}
