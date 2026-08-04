import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Send, Loader2 } from 'lucide-react';
import type { StoryGroup, Story } from '@/lib/storyApi';
import { markStoryViewed, fetchStoryViewers } from '@/lib/storyApi';
import { useAuthStore } from '@/lib/authStore';
import type { Profile } from '@/lib/types';

interface StoryViewerProps {
  groups: StoryGroup[];
  ownStories: Story[];
  initialGroupIndex: number;
  onClose: () => void;
}

export default function StoryViewer({
  groups,
  ownStories,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  const myProfile = useAuthStore((s) => s.profile);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<Profile[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const DURATION = 5000; // 5 seconds for photos

  // Build a flat list including own stories as the first group
  const allGroups: { user: Profile; stories: Story[]; has_unseen: boolean; is_own: boolean }[] = [];
  if (ownStories.length > 0 && myProfile) {
    allGroups.push({ user: myProfile, stories: ownStories, has_unseen: false, is_own: true });
  }
  groups.forEach((g) => allGroups.push({ ...g, is_own: false }));

  const currentGroup = allGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Mark viewed on mount of each story
  useEffect(() => {
    if (!currentStory || !myProfile) return;
    if (currentStory.user_id !== myProfile.id) {
      markStoryViewed(currentStory.id).catch(() => {});
    }
  }, [groupIndex, storyIndex]);

  // Load viewers for own stories
  useEffect(() => {
    if (!currentGroup?.is_own) {
      setShowViewers(false);
      return;
    }
  }, [groupIndex, storyIndex, currentGroup]);

  const isOwnStory = currentStory?.user_id === myProfile?.id;

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else if (groupIndex < allGroups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
      setProgress(0);
      elapsedRef.current = 0;
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup, allGroups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else if (groupIndex > 0) {
      const prevGroup = allGroups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
      elapsedRef.current = 0;
    }
  }, [storyIndex, groupIndex, allGroups]);

  // Progress timer
  useEffect(() => {
    if (!currentStory || paused) return;
    // Text stories load instantly; media stories show spinner until loaded
    if (currentStory.media_type === 'text') {
      setLoading(false);
    } else {
      setLoading(true);
    }
    startTimeRef.current = Date.now() - elapsedRef.current;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      const pct = (elapsed / DURATION) * 100;
      if (pct >= 100) {
        setProgress(100);
        goNext();
      } else {
        setProgress(pct);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStory, paused, goNext]);

  // Swipe down to close
  const touchStartY = useRef<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current !== null) {
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 100) {
        onClose();
        touchStartY.current = null;
      }
    }
  }
  function handleTouchEnd() {
    touchStartY.current = null;
  }

  if (!currentGroup || !currentStory) return null;

  function handleScreenClick(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) {
      goPrev();
    } else {
      goNext();
    }
  }

  async function handleShowViewers() {
    if (!currentStory) return;
    setShowViewers(true);
    setViewersLoading(true);
    const v = await fetchStoryViewers(currentStory.id);
    setViewers(v);
    setViewersLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white z-20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev / Next tap zones (desktop) */}
      <button
        onClick={goPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white z-20 hover:bg-black/50 hidden sm:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white z-20 hover:bg-black/50 hidden sm:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Story container */}
      <div
        className="relative w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black"
        onClick={handleScreenClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStartCapture={() => setPaused(true)}
        onTouchEndCapture={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header: user info */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-2 px-4 pt-2">
          <img
            src={currentGroup.user.avatar_url || `https://ui-avatars.com/api/?name=${currentGroup.user.full_name}`}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-white text-sm font-semibold">{currentGroup.user.full_name}</span>
          <span className="text-white/60 text-xs">@{currentGroup.user.username}</span>
          {isOwnStory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShowViewers();
              }}
              className="ml-auto flex items-center gap-1 text-white/80 text-xs hover:text-white"
            >
              <Eye className="h-4 w-4" /> Viewers
            </button>
          )}
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-5">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        )}

        {/* Story content */}
        {currentStory.media_type === 'text' ? (
          <div
            className="h-full w-full flex items-center justify-center p-8"
            style={{ background: currentStory.bg_gradient || 'linear-gradient(135deg, #0ea5a4 0%, #ff6b4a 100%)' }}
          >
            <p className="text-white text-2xl font-bold text-center break-words whitespace-pre-wrap">
              {currentStory.caption}
            </p>
          </div>
        ) : currentStory.media_type === 'video' ? (
          <video
            src={currentStory.media_url}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            onLoadedData={() => setLoading(false)}
            onEnded={goNext}
            muted
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt=""
            className="h-full w-full object-cover"
            onLoad={() => setLoading(false)}
          />
        )}

        {/* Caption overlay for media stories */}
        {currentStory.caption && currentStory.media_type !== 'text' && (
          <div className="absolute bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
            <p className="text-white text-lg font-semibold text-center break-words whitespace-pre-wrap">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Reply input */}
        {!isOwnStory && (
          <div
            className="absolute bottom-4 left-0 right-0 px-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to @${currentGroup.user.username}...`}
                className="flex-1 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/30 text-white placeholder-white/50 outline-none text-sm focus:border-white/60"
              />
              <button
                onClick={() => setReply('')}
                className="h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Viewers modal */}
      {showViewers && isOwnStory && (
        <div
          className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setShowViewers(false);
          }}
        >
          <div
            className="w-full sm:max-w-sm max-h-[60vh] bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
              <h3 className="font-heading font-bold text-gray-900 dark:text-white">Story Viewers</h3>
              <button
                onClick={() => setShowViewers(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {viewersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : viewers.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No viewers yet</p>
              ) : (
                viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                    <img
                      src={v.avatar_url || `https://ui-avatars.com/api/?name=${v.full_name}`}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{v.full_name}</p>
                      <p className="text-gray-400 text-xs">@{v.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
