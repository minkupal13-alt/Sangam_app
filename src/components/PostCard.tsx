import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  BadgeCheck,
  MoreHorizontal,
  Flag,
  Ban,
  VolumeX,
  Link2,
  BookmarkPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { timeAgo, formatCount } from '@/lib/format';

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onBookmark: (post: Post) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
}

const REACTIONS = [
  { emoji: '❤️', key: 'love', type: 'love' },
  { emoji: '😂', key: 'haha', type: 'haha' },
  { emoji: '😮', key: 'wow', type: 'wow' },
  { emoji: '😢', key: 'sad', type: 'sad' },
  { emoji: '😡', key: 'angry', type: 'angry' },
  { emoji: '👏', key: 'clap', type: 'clap' },
] as const;

type ReactionType = typeof REACTIONS[number]['type'];

/** Echo icon — two curved swirling arrows, distinct from X's repost */
function EchoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8C4 6 6 4 8 4h8l-3-3M20 16c0 2-2 4-4 4H8l3 3" />
      <path d="M7 8h10l-2.5-2.5M17 16H7l2.5 2.5" opacity="0.5" />
    </svg>
  );
}

export default function PostCard({ post, onLike, onBookmark, onComment, onShare }: PostCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [burst, setBurst] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;
      const { data } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('target_id', post.id)
        .eq('target_type', 'post')
        .eq('user_id', session.session.user.id)
        .maybeSingle();
      if (data) setMyReaction(data.reaction_type);
    })();
  }, [post.id]);

  const handleLike = useCallback(() => {
    if (!post.liked_by_me && !myReaction) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    onLike(post);
  }, [post, onLike, myReaction]);

  function startPress() {
    pressTimer.current = setTimeout(() => setShowReactions(true), 400);
  }
  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  async function handleReaction(reactionType: ReactionType) {
    setShowReactions(false);
    setMyReaction(reactionType);
    if (!post.liked_by_me) {
      onLike(post);
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;
    await supabase
      .from('reactions')
      .upsert({
        target_id: post.id,
        target_type: 'post',
        user_id: session.session.user.id,
        reaction_type: reactionType,
      }, { onConflict: 'target_id,target_type,user_id' });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  function handleCopyLink() {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  }

  const author = post.author;
  const original = post.original_post;
  const displayMedia = original?.media_urls?.length ? original.media_urls : post.media_urls;
  const displayContent = original ? original.content : post.content;
  const displayMediaType = original ? original.media_type : post.media_type;
  const displayAuthor = original ? original.author : author;

  return (
    <article className="mx-3 my-2.5 rounded-2xl bg-white dark:bg-navy-200 shadow-sm shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-navy-300 p-4 hover:shadow-md transition-shadow">
      {/* Echo indicator */}
      {original && (
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mb-2 ms-1">
          <EchoIcon className="h-3.5 w-3.5" />
          <span>{author?.full_name} {t('feed.echoed')}</span>
        </div>
      )}

      <div className="flex gap-3">
        <img
          src={displayAuthor?.avatar_url || `https://ui-avatars.com/api/?name=${displayAuthor?.full_name || 'U'}`}
          alt=""
          className="h-11 w-11 rounded-full object-cover flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/u/${displayAuthor?.username}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm">
            <span
              className="font-heading font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
              onClick={() => navigate(`/u/${displayAuthor?.username}`)}
            >
              {displayAuthor?.full_name}
            </span>
            {displayAuthor?.is_verified && <BadgeCheck className="h-4 w-4 text-brand-500 flex-shrink-0" />}
            <span className="text-gray-500 truncate">@{displayAuthor?.username}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 flex-shrink-0">
              {timeAgo(original ? original.created_at : post.created_at)}
            </span>
            <div className="ms-auto relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -m-1 rounded-full hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-30 animate-scaleIn">
                  <MenuItem icon={<BookmarkPlus className="h-4 w-4" />} label={t('feed.savePost')} onClick={() => { onBookmark(post); setShowMenu(false); }} />
                  <MenuItem icon={<Link2 className="h-4 w-4" />} label={copied ? '✓ Copied' : t('feed.copyLink')} onClick={handleCopyLink} />
                  <div className="my-1 border-t border-gray-100 dark:border-navy-300" />
                  <MenuItem icon={<Flag className="h-4 w-4" />} label={t('feed.report')} onClick={() => setShowMenu(false)} danger />
                  <MenuItem icon={<Ban className="h-4 w-4" />} label={t('feed.block')} onClick={() => setShowMenu(false)} danger />
                  <MenuItem icon={<VolumeX className="h-4 w-4" />} label={t('feed.mute')} onClick={() => setShowMenu(false)} danger />
                </div>
              )}
            </div>
          </div>

          {/* Echoer's caption (if any) */}
          {original && post.content && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 italic">{post.content}</p>
          )}

          {/* Main content */}
          {displayContent && (
            <p className="text-gray-900 dark:text-white text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
              {renderContent(displayContent, navigate)}
            </p>
          )}

          {/* Media */}
          {displayMedia && displayMedia.length > 0 && displayMediaType === 'image' && (
            <div
              className={`mt-2.5 rounded-2xl overflow-hidden border border-gray-100 dark:border-navy-300 ${
                displayMedia.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'
              }`}
            >
              {displayMedia.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`w-full object-cover ${displayMedia.length === 1 ? 'max-h-[500px]' : 'h-44'}`}
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {displayMedia && displayMedia.length > 0 && displayMediaType === 'video' && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-gray-100 dark:border-navy-300">
              <video src={displayMedia[0]} controls preload="metadata" className="w-full max-h-[500px]" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-md">
            {/* Like with long-press reactions */}
            <div className="relative">
              <ActionButton
                icon={
                  <div className="relative">
                    {myReaction ? (
                      <span className="text-base leading-none">{REACTIONS.find(r => r.type === myReaction)?.emoji}</span>
                    ) : (
                      <Heart
                        className={`h-[18px] w-[18px] transition-colors ${
                          post.liked_by_me ? 'fill-coral-500 text-coral-500' : 'text-gray-500'
                        }`}
                      />
                    )}
                    {burst && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="absolute h-[18px] w-[18px] rounded-full border-2 border-coral-500 animate-heartBurst" />
                      </span>
                    )}
                  </div>
                }
                label={formatCount(post.likes_count)}
                color={post.liked_by_me || myReaction ? 'text-coral-500' : 'text-gray-500 hover:text-coral-500'}
                onClick={handleLike}
                onMouseDown={startPress}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onTouchStart={startPress}
                onTouchEnd={cancelPress}
              />

              {/* Reactions popup */}
              {showReactions && (
                <div className="absolute bottom-full mb-2 left-0 flex gap-1 p-2 rounded-2xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 z-40 animate-scaleIn">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleReaction(r.type)}
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title={t(`feed.${r.key}`)}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ActionButton
              icon={<MessageCircle className="h-[18px] w-[18px]" />}
              label={formatCount(post.comments_count)}
              color="text-gray-500 hover:text-brand-500"
              onClick={() => onComment(post)}
            />
            <ActionButton
              icon={<EchoIcon className="h-[19px] w-[19px]" />}
              label=""
              color="text-gray-500 hover:text-brand-500"
              onClick={() => onShare(post)}
            />
            <ActionButton
              icon={
                <Bookmark
                  className={`h-[18px] w-[18px] ${post.bookmarked_by_me ? 'fill-brand-500 text-brand-500' : ''}`}
                />
              }
              label=""
              color={post.bookmarked_by_me ? 'text-brand-500' : 'text-gray-500 hover:text-brand-500'}
              onClick={() => onBookmark(post)}
            />
            <ActionButton
              icon={<Share className="h-[18px] w-[18px]" />}
              label=""
              color="text-gray-500 hover:text-brand-500"
              onClick={() => onShare(post)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-start transition-colors ${
        danger
          ? 'text-coral-500 hover:bg-coral-50 dark:hover:bg-coral-500/10'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`group flex items-center gap-1.5 text-sm transition-colors ${color}`}
    >
      <span className="p-1.5 -m-1.5 rounded-full transition-transform group-active:scale-90">{icon}</span>
      {label && <span className="tabular-nums">{label}</span>}
    </button>
  );
}

function renderContent(text: string, navigate: (path: string) => void) {
  const parts = text.split(/(@\w+|#\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span
          key={i}
          className="text-brand-500 hover:underline cursor-pointer"
          onClick={() => navigate(`/u/${username}`)}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <span
          key={i}
          className="text-brand-500 hover:underline cursor-pointer"
          onClick={() => navigate(`/hashtag/${tag}`)}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
