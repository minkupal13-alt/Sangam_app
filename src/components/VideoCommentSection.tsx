import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Send, Heart, CornerDownRight, X } from 'lucide-react';
import type { VideoComment } from '@/lib/types';
import {
  fetchVideoComments,
  addVideoComment,
  toggleVideoCommentLike,
} from '@/lib/watchApi';
import { timeAgo, formatCount } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';

interface VideoCommentSectionProps {
  videoId: string;
}

export default function VideoCommentSection({ videoId }: VideoCommentSectionProps) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sort, setSort] = useState<'top' | 'newest'>('newest');
  const [replyTo, setReplyTo] = useState<VideoComment | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchVideoComments(videoId, sort)
      .then((c) => active && setComments(c))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [videoId, sort]);

  async function handleSubmit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addVideoComment(videoId, text.trim(), replyTo?.id);
      setText('');
      setReplyTo(null);
      const fresh = await fetchVideoComments(videoId, sort);
      setComments(fresh);
    } catch {
      // ignore
    }
    setSending(false);
  }

  async function handleLikeComment(comment: VideoComment) {
    const next = !comment.liked_by_me;
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              liked_by_me: next,
              likes_count: next ? c.likes_count + 1 : Math.max(0, c.likes_count - 1),
            }
          : c,
      ),
    );
    toggleVideoCommentLike(comment.id, !next).catch(() => {});
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <h3 className="font-heading font-bold text-gray-900 dark:text-white text-lg">
          {comments.length} {t('watch.comments')}
        </h3>
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setSort('top')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              sort === 'top'
                ? 'bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              sort === 'newest'
                ? 'bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-6">
        <img
          src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={text.trim() ? 2 : 1}
            placeholder={replyTo ? t('watch.replyingTo', { user: replyTo.author?.username || 'user' }) : t('watch.addComment')}
            className="w-full px-1 py-2 bg-transparent border-b border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm"
          />
          <div className="flex items-center justify-end gap-2 mt-1">
            {replyTo && (
              <button
                onClick={() => setReplyTo(null)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
              >
                {t('watch.reply', { defaultValue: 'Cancel' })}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || sending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sangam-gradient text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform shadow-md shadow-coral-500/20"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('watch.reply', { defaultValue: 'Comment' })}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          {t('watch.noComments')}
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c.id}>
              <CommentRow comment={c} onReply={() => setReplyTo(c)} onLike={() => handleLikeComment(c)} />
              {c.replies && c.replies.length > 0 && (
                <div className="ml-10 mt-3 space-y-3 border-l border-gray-100 dark:border-navy-300 pl-3">
                  {c.replies.map((r) => (
                    <CommentRow
                      key={r.id}
                      comment={r}
                      onReply={() => setReplyTo(r)}
                      onLike={() => handleLikeComment(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  onLike,
}: {
  comment: VideoComment;
  onReply: () => void;
  onLike: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3">
      <img
        src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.full_name || 'U'}`}
        alt=""
        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-gray-900 dark:text-white">
            @{comment.author?.username || 'user'}
          </span>
          <span className="text-gray-400">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words whitespace-pre-wrap">
          {comment.content}
        </p>
        <div className="flex items-center gap-4 mt-1.5">
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-coral-500 transition-colors"
          >
            <Heart
              className={`h-3.5 w-3.5 ${comment.liked_by_me ? 'fill-coral-500 text-coral-500' : ''}`}
            />
            {comment.likes_count > 0 && <span>{formatCount(comment.likes_count)}</span>}
          </button>
          <button
            onClick={onReply}
            className="text-xs text-gray-400 hover:text-brand-500 font-medium transition-colors"
          >
            {t('watch.reply')}
          </button>
        </div>
      </div>
    </div>
  );
}
