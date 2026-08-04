import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Heart,
  Send,
  X,
  Loader2,
  Eye,
  Video,
  VideoOff,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';
import type { LiveStream, LiveComment } from '@/lib/types';
import {
  fetchLiveStreamById,
  fetchLiveComments,
  sendLiveComment,
  subscribeToLiveComments,
  subscribeToViewerCount,
  endLiveStream,
} from '@/lib/liveApi';

interface FloatingHeart {
  id: number;
  x: number;
}

export default function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [ending, setEnding] = useState(false);
  const unsubCommentsRef = useRef<ReturnType<typeof subscribeToLiveComments> | null>(null);
  const unsubViewersRef = useRef<ReturnType<typeof subscribeToViewerCount> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartIdRef = useRef(0);

  usePageTitle(stream?.title ? `${stream.title} | Sangam` : 'Live | Sangam');

  useEffect(() => {
    if (!id) return;
    loadStream();
    return () => {
      unsubCommentsRef.current?.unsubscribe();
      unsubViewersRef.current?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function loadStream() {
    if (!id) return;
    setLoading(true);
    try {
      const s = await fetchLiveStreamById(id);
      setStream(s);
      const initialComments = await fetchLiveComments(id);
      setComments(initialComments);
      const subC = subscribeToLiveComments(id, (comment) => {
        setComments((prev) => [...prev, comment]);
      });
      unsubCommentsRef.current = subC;
      const subV = subscribeToViewerCount(id, (count) => {
        setViewerCount(count);
      });
      unsubViewersRef.current = subV;
    } catch (err) {
      console.error('loadStream error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !profile) return;
    if (!commentText.trim()) return;
    setSending(true);
    const text = commentText.trim();
    setCommentText('');
    try {
      await sendLiveComment(id, text);
    } catch (err) {
      console.error('sendLiveComment error', err);
      setCommentText(text);
    } finally {
      setSending(false);
    }
  }

  function handleSendHeart() {
    const heart: FloatingHeart = {
      id: heartIdRef.current++,
      x: Math.random() * 80 - 40,
    };
    setHearts((prev) => [...prev, heart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heart.id));
    }, 3000);
  }

  async function handleEndStream() {
    if (!id) return;
    if (!confirm('End this live stream?')) return;
    setEnding(true);
    try {
      await endLiveStream(id);
      unsubCommentsRef.current?.unsubscribe();
      unsubViewersRef.current?.unsubscribe();
      navigate('/');
    } catch (err) {
      console.error('endLiveStream error', err);
      setEnding(false);
    }
  }

  const isHost = stream?.user_id === profile?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center px-4">
        <VideoOff className="h-12 w-12 text-gray-500 mb-3" />
        <p className="text-white font-heading font-bold text-lg">Stream unavailable</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col sm:flex-row z-50">
      {/* Video area */}
      <div
        className="relative flex-1 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden"
        onClick={handleSendHeart}
      >
        {/* Video / placeholder */}
        {stream.replay_url ? (
          <video
            src={stream.replay_url}
            autoPlay
            muted
            loop
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-center px-4">
            <div className="h-24 w-24 rounded-full bg-sangam-gradient mx-auto flex items-center justify-center mb-4">
              <Video className="h-12 w-12 text-white" />
            </div>
            <p className="text-white font-heading font-bold text-lg">{stream.title}</p>
            <p className="text-gray-400 text-sm mt-1">
              by @{stream.author?.username || 'host'}
            </p>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs font-semibold">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(viewerCount)}
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Host info */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-700 border-2 border-white/30">
            {stream.author?.avatar_url ? (
              <img
                src={stream.author.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                <Video className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-bold drop-shadow">
              @{stream.author?.username || 'host'}
            </p>
            <p className="text-white/70 text-xs drop-shadow line-clamp-1 max-w-[200px]">
              {stream.title}
            </p>
          </div>
        </div>

        {/* Floating hearts */}
        <div className="absolute bottom-20 right-8 pointer-events-none">
          {hearts.map((h) => (
            <Heart
              key={h.id}
              className="absolute h-8 w-8 text-coral-500 fill-coral-500 animate-floatUp"
              style={{
                right: `${h.x}px`,
                bottom: 0,
              }}
            />
          ))}
        </div>

        {/* Heart button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSendHeart();
          }}
          className="absolute bottom-24 right-4 h-12 w-12 rounded-full bg-coral-500/80 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <Heart className="h-6 w-6 text-white fill-white" />
        </button>

        {/* End stream (host only) */}
        {isHost && (
          <button
            onClick={handleEndStream}
            disabled={ending}
            className="absolute top-16 right-4 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95"
          >
            {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <VideoOff className="h-3.5 w-3.5" />}
            End
          </button>
        )}
      </div>

      {/* Chat sidebar */}
      <div className="w-full sm:w-80 bg-white dark:bg-navy-200 flex flex-col h-64 sm:h-auto border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-navy-300">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-300 flex items-center justify-between">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Live Chat
          </h2>
          <span className="text-xs text-gray-400">{formatCount(viewerCount)} watching</span>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Be the first to say hi 👋
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300 flex-shrink-0">
                  {c.author?.avatar_url ? (
                    <img
                      src={c.author.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">
                        {(c.author?.full_name || c.author?.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {c.author?.username || 'user'}
                    </span>
                    <span className="text-gray-400 ml-1.5">{timeAgo(c.created_at)}</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Comment input */}
        <form
          onSubmit={handleSendComment}
          className="p-3 border-t border-gray-100 dark:border-navy-300 flex items-center gap-2"
        >
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Say something..."
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-full bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !commentText.trim()}
            className="h-9 w-9 rounded-full bg-sangam-gradient text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
