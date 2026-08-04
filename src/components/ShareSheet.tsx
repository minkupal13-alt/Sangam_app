import { useState } from 'react';
import { X, Link2, Check, Loader2 } from 'lucide-react';
import type { Post } from '@/lib/types';
import { createRepost } from '@/lib/feedApi';
import { useAuthStore } from '@/lib/authStore';
import { useFeedStore } from '@/lib/feedStore';

/** Echo icon — two curved swirling arrows */
function EchoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8C4 6 6 4 8 4h8l-3-3M20 16c0 2-2 4-4 4H8l3 3" />
      <path d="M7 8h10l-2.5-2.5M17 16H7l2.5 2.5" opacity="0.5" />
    </svg>
  );
}

interface ShareSheetProps {
  post: Post | null;
  onClose: () => void;
}

export default function ShareSheet({ post, onClose }: ShareSheetProps) {
  const profile = useAuthStore((s) => s.profile);
  const addPost = useFeedStore((s) => s.addPost);
  const [mode, setMode] = useState<'menu' | 'echo'>('menu');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!post) return null;

  const shareUrl = `${window.location.origin}/u/${post.author?.username || ''}#post-${post.id}`;

  async function handleEcho() {
    if (!post) return;
    setLoading(true);
    setError('');
    try {
      const newPost = await createRepost(post.id, caption.trim());
      if (newPost && profile) {
        addPost({
          ...newPost,
          author: profile,
          liked_by_me: false,
          bookmarked_by_me: false,
          original_post: post,
        });
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echo failed');
    }
    setLoading(false);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        handleClose();
      }, 1200);
    } catch {
      setError('Could not copy link');
    }
  }

  function handleClose() {
    setMode('menu');
    setCaption('');
    setError('');
    setCopied(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">
            {mode === 'menu' ? 'Share' : 'Echo'}
          </h2>
          <div className="w-8" />
        </div>

        {mode === 'menu' ? (
          <div className="p-4 space-y-2">
            <button
              onClick={() => setMode('echo')}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <EchoIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Echo to feed</p>
                <p className="text-gray-400 text-xs">Share this post with your circle</p>
              </div>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-coral-100 dark:bg-coral-900/30 flex items-center justify-center text-coral-600 dark:text-coral-400">
                {copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {copied ? 'Link copied!' : 'Copy link'}
                </p>
                <p className="text-gray-400 text-xs">Copy post link to clipboard</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Original post preview */}
            <div className="flex gap-2 p-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300">
              <img
                src={
                  post.original_post?.author?.avatar_url ||
                  post.author?.avatar_url ||
                  `https://ui-avatars.com/api/?name=U`
                }
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  @{post.original_post?.author?.username || post.author?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {(post.original_post?.content || post.content).slice(0, 80)}
                </p>
              </div>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a comment (optional)..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm"
            />

            {error && <p className="text-coral-500 text-sm">{error}</p>}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{caption.length}/200</span>
              <button
                onClick={handleEcho}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold disabled:opacity-60 active:scale-95 transition-transform shadow-md shadow-coral-500/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <EchoIcon className="h-4 w-4" />}
                Echo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
