import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import type { Video } from '@/lib/types';
import { fetchSubscribedVideos } from '@/lib/watchApi';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';

export default function SubscriptionsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadVideos = useCallback(async (page: number, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const { videos: newVideos, hasMore: more } = await fetchSubscribedVideos(page);
      setVideos((prev) => (replace ? newVideos : [...prev, ...newVideos]));
      setHasMore(more);
      pageRef.current = page;
    } catch {
      // ignore
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    loadVideos(0, true);
  }, [loadVideos]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadVideos(pageRef.current + 1, false);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadVideos]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-5 w-5 text-brand-500" />
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Subscriptions
        </h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-400 font-heading font-bold text-lg">No new videos</p>
          <p className="text-gray-400 text-sm mt-1">
            Subscribe to channels to see their latest videos here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
            {loadingMore &&
              Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`more-${i}`} />)}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}
