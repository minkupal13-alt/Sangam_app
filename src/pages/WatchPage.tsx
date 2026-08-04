import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Plus, Bell } from 'lucide-react';
import type { Video } from '@/lib/types';
import { fetchVideos, VIDEO_CATEGORIES } from '@/lib/watchApi';
import { useUIStore } from '@/lib/uiStore';
import { useNavigate } from 'react-router-dom';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';
import { usePageTitle } from '@/lib/usePageTitle';

export default function WatchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const openVideoUpload = useUIStore((s) => s.openVideoUpload);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  usePageTitle(`${t('watch.title')} | Sangam`);

  const loadVideos = useCallback(
    async (page: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const { videos: newVideos, hasMore: more } = await fetchVideos({
          page,
          category,
          search: search || undefined,
        });
        setVideos((prev) => (replace ? newVideos : [...prev, ...newVideos]));
        setHasMore(more);
        pageRef.current = page;
      } catch {
        // ignore
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [category, search],
  );

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const categoryLabel = (cat: string) => {
    const key = cat.toLowerCase();
    return t(`watch.${key}`, { defaultValue: cat });
  };

  return (
    <div className="px-4 py-4 relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">{t('watch.title')}</h1>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/notifications')}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500 hover:text-brand-500 transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={openVideoUpload}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-semibold shadow-md shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> {t('watch.upload')}
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('watch.search')}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
          />
        </div>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
        {VIDEO_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              category === cat
                ? 'bg-sangam-gradient text-white shadow-md shadow-coral-500/20'
                : 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-50'
            }`}
          >
            {categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-400 font-heading font-bold text-lg">
            {search ? t('watch.noVideosSearch') : t('watch.noVideos')}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? t('watch.tryDifferent') : t('watch.uploadToStart')}
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
          {!hasMore && videos.length > 0 && (
            <p className="text-center text-gray-400 text-sm py-6">{t('watch.endOfFeed')}</p>
          )}
        </>
      )}
    </div>
  );
}
