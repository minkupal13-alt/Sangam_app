import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, ThumbsUp, ThumbsDown, Share2, Bookmark, BadgeCheck,
  ChevronDown, ChevronUp, MoreVertical, X, Copy, Check,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import {
  fetchVideoById, fetchRelatedVideos, setVideoReaction,
  toggleSubscription, recordWatchHistory, toggleWatchLater,
} from '@/lib/watchApi';
import { useAuthStore } from '@/lib/authStore';
import { formatCount, timeAgo } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';
import VideoPlayer from '@/components/VideoPlayer';
import VideoCard from '@/components/VideoCard';
import VideoCommentSection from '@/components/VideoCommentSection';

function EchoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8C4 6 6 4 8 4h8l-3-3M20 16c0 2-2 4-4 4H8l3 3" />
      <path d="M7 8h10l-2.5-2.5M17 16H7l2.5 2.5" opacity="0.5" />
    </svg>
  );
}

export default function WatchVideoPage() {
  const { t } = useTranslation();
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const historyRecorded = useRef(false);

  usePageTitle(video ? `${video.title} | Sangam Watch` : 'Watch | Sangam');

  const loadVideo = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    historyRecorded.current = false;
    try {
      const v = await fetchVideoById(videoId);
      setVideo(v);
      if (v) {
        setLikeCount(v.likes_count);
        setDislikeCount(v.dislikes_count);
        setMyReaction(v.my_reaction ?? null);
        setSubscribed(v.is_subscribed ?? false);
        setSubscriberCount(v.author?.subscribers_count ?? 0);
        const rel = await fetchRelatedVideos(v);
        setRelated(rel);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [videoId]);

  useEffect(() => { loadVideo(); }, [loadVideo]);

  useEffect(() => {
    if (!videoId || !video) return;
    const timer = setTimeout(() => {
      if (!historyRecorded.current) {
        historyRecorded.current = true;
        recordWatchHistory(videoId, 0).catch(() => {});
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [videoId, video]);

  function handleReaction(reaction: 'like' | 'dislike') {
    if (!videoId) return;
    const prev = myReaction;
    setMyReaction(reaction);
    if (reaction === 'like') {
      setLikeCount((c) => c + (prev === 'like' ? -1 : prev === 'dislike' ? 1 : 1));
      setDislikeCount((c) => (prev === 'dislike' ? Math.max(0, c - 1) : c));
    } else {
      setDislikeCount((c) => c + (prev === 'dislike' ? -1 : prev === 'like' ? 1 : 1));
      setLikeCount((c) => (prev === 'like' ? Math.max(0, c - 1) : c));
    }
    setVideoReaction(videoId, reaction, prev).catch(() => {});
  }

  function handleSubscribe() {
    if (!video) return;
    const next = !subscribed;
    setSubscribed(next);
    setSubscriberCount((c) => c + (next ? 1 : -1));
    toggleSubscription(video.user_id, !next).catch(() => {});
  }

  function handleSave() {
    if (!videoId) return;
    const next = !saved;
    setSaved(next);
    toggleWatchLater(videoId, !next).catch(() => {});
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/watch/${videoId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  async function handleNativeShare() {
    const url = `${window.location.origin}/watch/${videoId}`;
    if (navigator.share) {
      try { await navigator.share({ title: video?.title, url }); } catch { /* cancelled */ }
    } else {
      handleCopyLink();
    }
  }

  // Autoplay next countdown
  useEffect(() => {
    if (!autoplayNext || !video || related.length === 0) return;
    let countdown = 5;
    setAutoplayCountdown(countdown);
    const timer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(timer);
        setAutoplayCountdown(null);
        navigate(`/watch/${related[0].id}`);
      } else {
        setAutoplayCountdown(countdown);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [autoplayNext, video, related, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 font-heading font-bold text-lg">{t('watch.videoNotFound')}</p>
        <button
          onClick={() => navigate('/watch')}
          className="mt-4 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold"
        >
          {t('watch.backToWatch')}
        </button>
      </div>
    );
  }

  const author = video.author;

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Player */}
          <VideoPlayer src={video.video_url} poster={video.thumbnail_url || undefined} />

          {/* Title */}
          <h1 className="font-heading font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white mt-3">
            {video.title}
          </h1>

          {/* Stats + actions */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm text-gray-500">
              {formatCount(video.views_count)} {t('watch.views')} · {timeAgo(video.created_at)}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  myReaction === 'like'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-50'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                {formatCount(likeCount)}
              </button>
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  myReaction === 'dislike'
                    ? 'bg-coral-500 text-white'
                    : 'bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-50'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                {formatCount(dislikeCount)}
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-navy-50 transition-colors active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                {t('watch.share')}
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  saved
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-50'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
                {t('watch.save')}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-11 w-44 bg-white dark:bg-navy-200 rounded-xl shadow-lg border border-gray-100 dark:border-navy-300 py-1 z-30">
                    <button onClick={() => setShowMoreMenu(false)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300">
                      {t('watch.saveToPlaylist')}
                    </button>
                    <button onClick={() => setShowMoreMenu(false)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300">
                      {t('watch.notInterested')}
                    </button>
                    <button onClick={() => setShowMoreMenu(false)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300">
                      {t('watch.report')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Channel row */}
          <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100 dark:border-navy-300">
            <img
              src={author?.avatar_url || `https://ui-avatars.com/api/?name=${author?.full_name || 'U'}`}
              alt=""
              className="h-11 w-11 rounded-full object-cover cursor-pointer"
              onClick={() => navigate(`/u/${author?.username}`)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className="font-heading font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline"
                  onClick={() => navigate(`/u/${author?.username}`)}
                >
                  {author?.full_name}
                </span>
                {author?.is_verified && <BadgeCheck className="h-4 w-4 text-brand-500" />}
              </div>
              <p className="text-xs text-gray-400">
                {formatCount(subscriberCount)} {t('watch.subscribers')}
              </p>
            </div>
            {video.user_id !== profile?.id && (
              <button
                onClick={handleSubscribe}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                  subscribed
                    ? 'bg-gray-200 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                    : 'bg-sangam-gradient text-white shadow-md shadow-coral-500/20'
                }`}
              >
                {subscribed ? t('watch.subscribed') : t('watch.subscribe')}
              </button>
            )}
          </div>

          {/* Description */}
          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-navy-300">
            <div className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words ${descExpanded ? '' : 'line-clamp-3'}`}>
              {renderDescription(video.description || '')}
            </div>
            {video.description && video.description.length > 120 && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium mt-1 flex items-center gap-1"
              >
                {descExpanded ? (
                  <>{t('watch.showLess', { defaultValue: 'Show less' })} <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>...more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {video.tags.map((tag) => (
                  <span key={tag} className="text-xs text-brand-500 font-medium bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <VideoCommentSection videoId={video.id} />
        </div>

        {/* Related sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          {/* Autoplay toggle */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-gray-900 dark:text-white text-sm">
              {t('watch.relatedVideos')}
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{t('watch.autoplayNext')}</span>
              <button
                onClick={() => setAutoplayNext((v) => !v)}
                className={`h-5 w-9 rounded-full transition-colors ${autoplayNext ? 'bg-brand-500' : 'bg-gray-300 dark:bg-navy-300'}`}
              >
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${autoplayNext ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          {/* Autoplay countdown banner */}
          {autoplayCountdown !== null && related.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center gap-3">
              <img src={related[0].thumbnail_url || ''} alt="" className="h-10 w-16 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{t('watch.upNext')}</p>
                <p className="text-xs text-gray-500">{t('watch.startingIn', { seconds: autoplayCountdown })}</p>
              </div>
              <button
                onClick={() => setAutoplayCountdown(null)}
                className="text-xs text-gray-500 font-medium px-2 py-1 rounded-full bg-white dark:bg-navy-300"
              >
                {t('watch.cancelAutoplay')}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {related.length === 0 ? (
              <p className="text-gray-400 text-sm">{t('watch.noRelated')}</p>
            ) : (
              related.map((v) => (
                <div key={v.id} className="flex gap-2 cursor-pointer group" onClick={() => navigate(`/watch/${v.id}`)}>
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-navy-300 flex-shrink-0">
                    <img
                      src={v.thumbnail_url || ''}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                    {v.duration_seconds > 0 && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                        {Math.floor(v.duration_seconds / 60)}:{String(Math.floor(v.duration_seconds % 60)).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {v.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">{v.author?.full_name}</p>
                    <p className="text-[11px] text-gray-400">
                      {formatCount(v.views_count)} {t('watch.views')} · {timeAgo(v.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Share sheet */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowShare(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl p-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('watch.shareVideo')}</h2>
              <button
                onClick={() => setShowShare(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-300 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-600">
                {copied ? <Check className="h-5 w-5 text-brand-500" /> : <Copy className="h-5 w-5" />}
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {copied ? t('watch.copied') : t('watch.copyLink')}
              </span>
            </button>
            <button
              onClick={() => { handleNativeShare(); setShowShare(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-300 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                <Share2 className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">{t('watch.share')}</span>
            </button>
            <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-navy-300">
              <p className="text-xs text-gray-400 mb-1">{t('watch.embedCode')}</p>
              <code className="text-xs text-gray-600 dark:text-gray-300 break-all">
                {`<iframe src="${window.location.origin}/watch/${videoId}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderDescription(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const timeRegex = /(\b\d{1,2}:\d{2}\b)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
          {part}
        </a>
      );
    }
    // Render timestamp links
    const subParts = part.split(timeRegex);
    return subParts.map((sub, j) => {
      if (sub.match(timeRegex)) {
        return (
          <button key={`${i}-${j}`} className="text-brand-500 hover:underline font-medium">
            {sub}
          </button>
        );
      }
      return <span key={`${i}-${j}`}>{sub}</span>;
    });
  });
}
