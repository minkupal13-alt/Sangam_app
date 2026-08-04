import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, BadgeCheck, Loader2, CornerDownRight, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Post, Comment } from '@/lib/types';
import { fetchComments, addComment } from '@/lib/feedApi';
import { timeAgo, formatCount } from '@/lib/format';

interface CommentSheetProps {
  post: Post | null;
  onClose: () => void;
}

export default function CommentSheet({ post, onClose }: CommentSheetProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    fetchComments(post.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [post]);

  // Real-time new comments
  useEffect(() => {
    if (!post) return;
    const channel = supabase
      .channel(`comments:${post.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        () => {
          fetchComments(post.id).then(setComments).catch(() => {});
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post]);

  async function handleSubmit() {
    if (!text.trim() || !post) return;
    setSubmitting(true);
    const content = text.trim();
    setText('');
    const parentId = replyTo;
    setReplyTo(null);
    await addComment(post.id, content, parentId || undefined);
    const fresh = await fetchComments(post.id);
    setComments(fresh);
    setSubmitting(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }

  async function toggleCommentLike(commentId: string) {
    const isLiked = likedComments.has(commentId);
    if (isLiked) {
      setLikedComments((prev) => { const n = new Set(prev); n.delete(commentId); return n; });
      await supabase.from('likes').delete().eq('target_id', commentId).eq('target_type', 'comment');
    } else {
      setLikedComments((prev) => new Set([...prev, commentId]));
      await supabase.from('likes').insert({ target_id: commentId, target_type: 'comment' });
    }
  }

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('common.comment')}s</h2>
          <div className="w-8" />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-400 py-8">{t('feed.noCommentsYet')}</p>
          ) : (
            comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onReply={(id) => setReplyTo(id)}
                liked={likedComments.has(c.id)}
                onLike={() => toggleCommentLike(c.id)}
              />
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-navy-300">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <CornerDownRight className="h-3 w-3" /> {t('feed.replyingTo')}
              <button onClick={() => setReplyTo(null)} className="text-brand-500 ms-auto">{t('common.cancel')}</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !submitting && handleSubmit()}
              placeholder={t('feed.addComment')}
              className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shadow-md shadow-coral-500/20"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  liked,
  onLike,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  liked: boolean;
  onLike: () => void;
}) {
  const { t } = useTranslation();
  const [showAllReplies, setShowAllReplies] = useState(false);
  const replies = comment.replies || [];
  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);

  return (
    <div>
      <div className="flex gap-3">
        <img
          src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.full_name || 'U'}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">{comment.author?.full_name}</span>
            {comment.author?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
            <span className="text-gray-400 text-xs ms-1">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm mt-0.5">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button onClick={onLike} className={`flex items-center gap-1 text-xs ${liked ? 'text-coral-500' : 'text-gray-400 hover:text-coral-500'}`}>
              <Heart className={`h-3 w-3 ${liked ? 'fill-coral-500' : ''}`} />
              {comment.likes_count > 0 && formatCount(comment.likes_count)}
            </button>
            <button onClick={() => onReply(comment.id)} className="text-xs text-gray-400 hover:text-brand-500">
              {t('feed.reply')}
            </button>
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ms-12 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-navy-300 ps-4">
          {visibleReplies.map((r) => (
            <div key={r.id} className="flex gap-3">
              <img
                src={r.author?.avatar_url || `https://ui-avatars.com/api/?name=${r.author?.full_name || 'U'}`}
                alt=""
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">{r.author?.full_name}</span>
                  {r.author?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
                  <span className="text-gray-400 text-xs ms-1">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm mt-0.5">{r.content}</p>
              </div>
            </div>
          ))}
          {replies.length > 1 && !showAllReplies && (
            <button onClick={() => setShowAllReplies(true)} className="text-xs text-brand-500 hover:underline">
              {t('feed.reply')} · {replies.length - 1} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
