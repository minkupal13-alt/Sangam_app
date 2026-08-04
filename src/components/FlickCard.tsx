import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Bookmark, Music, Plus, Check, Loader2, Share2, MoreVertical, Flag, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import type { Flick } from '@/lib/types';
import { formatCount } from '@/lib/format';
import { toggleFlickLike, toggleFlickBookmark, recordFlickView, getFlickShareUrl } from '@/lib/flickApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';

function EchoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8C4 6 6 4 8 4h8l-3-3M20 16c0 2-2 4-4 4H8l3 3" />
      <path d="M7 8h10l-2.5-2.5M17 16H7l2.5 2.5" opacity="0.5" />
    </svg>
  );
}

const REACTIONS = ['❤️', '🔥', '😂', '👏', '😮', '😢'];

interface FlickCardProps {
  flick: Flick;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenComments: () => void;
  onEcho: () => void;
  onShare: () => void;
}

export default function FlickCard({
  flick,
  isActive,
  muted,
  onToggleMute,
  onOpenComments,
  onEcho,
  onShare,
}: FlickCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(flick.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(flick.likes_count);
  const [saved, setSaved] = useState(flick.bookmarked_by_me ?? false);
  const [burst, setBurst] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const viewRecorded = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || flick.user_id === profile.id) return;
    let active = true;
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', profile.id)
      .eq('following_id', flick.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsFollowing(!!data);
      });
    return () => { active = false; };
  }, [profile, flick.user_id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
      setIsPaused(false);
      viewRecorded.current = false;
      const timer = setTimeout(() => {
        if (!viewRecorded.current) {
          viewRecorded.current = true;
          recordFlickView(flick.id).catch(() => {});
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      v.pause();
    }
  }, [isActive, flick.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  function togglePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPaused(false);
    } else {
      v.pause();
      setIsPaused(true);
    }
  }

  function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    if (next) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    toggleFlickLike(flick.id, !next).catch(() => {});
  }

  function handleReaction(emoji: string) {
    setShowReactions(false);
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
      toggleFlickLike(flick.id, false).catch(() => {});
    }
  }

  function startLongPress() {
    longPressTimer.current = setTimeout(() => setShowReactions(true), 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleBookmark() {
    const next = !saved;
    setSaved(next);
    toggleFlickBookmark(flick.id, !next).catch(() => {});
  }

  async function handleFollow() {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', flick.user_id);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: profile.id, following_id: flick.user_id });
      setIsFollowing(true);
    }
    setFollowLoading(false);
  }

  async function handleNativeShare() {
    const url = getFlickShareUrl(flick.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sangam Flick', text: flick.caption, url });
      } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    }
    onShare();
  }

  const author = flick.author;
  const isOwn = profile?.id === flick.user_id;
  const hashtags = (flick.caption.match(/#\w+/g) || []) as string[];

  function renderCaption() {
    const parts = flick.caption.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <button key={i} onClick={() => navigate(`/flicks?tag=${part.slice(1)}`)} className="text-brand-400 hover:underline font-medium">
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center reels-snap">
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          {flick.thumbnail_url && (
            <img src={flick.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <Loader2 className="h-8 w-8 animate-spin text-white/70 z-10" />
        </div>
      )}

      <video
        ref={videoRef}
        src={flick.video_url}
        poster={flick.thumbnail_url || undefined}
        loop
        playsInline
        muted={muted}
        onClick={togglePlayPause}
        onLoadedData={() => setVideoLoaded(true)}
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full object-cover"
      />

      {/* Pause indicator */}
      {isPaused && videoLoaded && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="h-16 w-16 rounded-full bg-black/40 flex items-center justify-center">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Mute/unmute button (top right) */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/40 flex items-center justify-center text-white active:scale-90 transition-transform"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Mute hint */}
      {muted && videoLoaded && !isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/50 rounded-full px-3 py-1.5 text-white text-xs font-medium">
            {t('flicks.tapToUnmute')}
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Right side action rail */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {/* Avatar + follow */}
        <div className="relative mb-1">
          <button
            onClick={() => navigate(`/u/${author?.username}`)}
            className="h-12 w-12 rounded-full overflow-hidden border-2 border-white"
          >
            <img src={author?.avatar_url || `https://ui-avatars.com/api/?name=${author?.full_name || 'U'}`} alt="" className="h-full w-full object-cover" />
          </button>
          {!isOwn && !isFollowing && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-sangam-gradient flex items-center justify-center border-2 border-black/80"
            >
              {followLoading ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" /> : <Plus className="h-3 w-3 text-white" />}
            </button>
          )}
          {isOwn && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center border-2 border-black/80">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Like with long-press reactions */}
        <div className="relative">
          <button
            onClick={handleLike}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            className="flex flex-col items-center gap-1"
          >
            <div className="relative">
              <Heart className={`h-8 w-8 transition-transform active:scale-90 ${liked ? 'fill-coral-500 text-coral-500' : 'text-white'}`} />
              {burst && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute h-8 w-8 rounded-full border-2 border-coral-500 animate-heartBurst" />
                </span>
              )}
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">{formatCount(likeCount)}</span>
          </button>
          {showReactions && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-black/80 rounded-full px-2 py-1.5 z-20">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <button onClick={onOpenComments} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white active:scale-90 transition-transform" />
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(flick.comments_count)}</span>
        </button>

        {/* Echo */}
        <button onClick={onEcho} className="flex flex-col items-center gap-1">
          <EchoIcon className="h-8 w-8 text-white active:scale-90 transition-transform" />
          <span className="text-white text-xs font-semibold drop-shadow">{t('flicks.echo')}</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1">
          <Bookmark className={`h-8 w-8 text-white active:scale-90 transition-transform ${saved ? 'fill-brand-500 text-brand-500' : ''}`} />
          <span className="text-white text-xs font-semibold drop-shadow">{t('flicks.save')}</span>
        </button>

        {/* Share */}
        <button onClick={handleNativeShare} className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8 text-white active:scale-90 transition-transform" />
          <span className="text-white text-xs font-semibold drop-shadow">{t('flicks.share')}</span>
        </button>

        {/* More */}
        <div className="relative">
          <button onClick={() => setShowMoreMenu((v) => !v)} className="flex flex-col items-center gap-1">
            <MoreVertical className="h-8 w-8 text-white active:scale-90 transition-transform" />
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 top-10 w-44 bg-white dark:bg-navy-200 rounded-xl shadow-lg border border-gray-100 dark:border-navy-300 py-1 z-30" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowMoreMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 flex items-center gap-2">
                <Flag className="h-4 w-4" /> {t('flicks.notInterested')}
              </button>
              <button onClick={() => { setShowMoreMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 flex items-center gap-2">
                <Flag className="h-4 w-4" /> {t('flicks.report')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-left overlay */}
      <div className="absolute left-4 right-20 bottom-28 z-10">
        <button
          onClick={() => navigate(`/u/${author?.username}`)}
          className="text-white font-heading font-bold text-base drop-shadow hover:underline"
        >
          @{author?.username || 'user'}
        </button>
        <div className={`text-white text-sm mt-1 drop-shadow ${captionExpanded ? '' : 'line-clamp-2'}`}>
          {renderCaption()}
        </div>
        {!captionExpanded && flick.caption.length > 80 && (
          <button onClick={() => setCaptionExpanded(true)} className="text-white/70 text-xs font-medium mt-0.5">
            ...more
          </button>
        )}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {hashtags.slice(0, 5).map((tag) => (
              <button key={tag} onClick={() => navigate(`/flicks?tag=${tag.slice(1)}`)} className="text-brand-300 text-xs font-medium hover:underline">
                {tag}
              </button>
            ))}
          </div>
        )}
        {flick.audio_name && (
          <button
            onClick={() => navigate(`/flicks/audio/${encodeURIComponent(flick.audio_name!)}`)}
            className="flex items-center gap-1.5 mt-2 text-white/90 text-xs hover:underline"
          >
            <Music className="h-3.5 w-3.5 animate-spin" />
            <span className="truncate max-w-[180px]">{flick.audio_name}</span>
          </button>
        )}
      </div>

      {/* Progress bar at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-10">
        <div className="h-full bg-white transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
