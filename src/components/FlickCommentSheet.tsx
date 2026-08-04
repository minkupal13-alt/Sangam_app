import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Loader2, CornerDownRight } from 'lucide-react';
import type { FlickComment } from '@/lib/types';
import { fetchFlickComments, addFlickComment } from '@/lib/flickApi';
import { timeAgo } from '@/lib/format';

interface FlickCommentSheetProps {
  flickId: string;
  onClose: () => void;
}

export default function FlickCommentSheet({ flickId, onClose }: FlickCommentSheetProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<FlickComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<FlickComment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFlickComments(flickId)
      .then((c) => {
        if (active) setComments(c);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [flickId]);

  async function handleSubmit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addFlickComment(flickId, text.trim(), replyTo?.id);
      setText('');
      setReplyTo(null);
      const fresh = await fetchFlickComments(flickId);
      setComments(fresh);
    } catch {
      // ignore
    }
    setSending(false);
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40 backdrop-blur-[2px] animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="h-[55vh] flex flex-col bg-white dark:bg-navy-200 rounded-t-3xl border-t border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('flicks.comments')}</h2>
          <div className="w-8" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {t('flicks.noComments')}
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id}>
                <CommentRow
                  comment={c}
                  onReply={() => setReplyTo(c)}
                />
                {c.replies && c.replies.length > 0 && (
                  <div className="ml-10 mt-2 space-y-2 border-l border-gray-100 dark:border-navy-300 pl-3">
                    {c.replies.map((r) => (
                      <CommentRow key={r.id} comment={r} onReply={() => setReplyTo(r)} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-navy-300 text-xs text-gray-500">
            <CornerDownRight className="h-3.5 w-3.5" />
            <span>
              {t('flicks.replyingTo', { user: replyTo.author?.username || 'user' })}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-navy-300 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={replyTo ? t('flicks.replyingTo', { user: replyTo.author?.username || 'user' }) : t('flicks.addComment')}
            className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || sending}
            className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shadow-md shadow-coral-500/20"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
}: {
  comment: FlickComment;
  onReply: () => void;
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
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words">
          {comment.content}
        </p>
        <button
          onClick={onReply}
          className="text-xs text-gray-400 hover:text-brand-500 mt-1 font-medium"
        >
          {t('flicks.reply')}
        </button>
      </div>
    </div>
  );
}
