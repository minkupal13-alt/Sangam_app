import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Plus } from 'lucide-react';
import type { Flick } from '@/lib/types';
import { fetchFlicks } from '@/lib/flickApi';
import { useUIStore } from '@/lib/uiStore';
import FlickCard from '@/components/FlickCard';
import FlickCommentSheet from '@/components/FlickCommentSheet';
import { usePageTitle } from '@/lib/usePageTitle';

type FeedTab = 'foryou' | 'following' | 'trending';

interface FlicksPageProps {
  uploadOpen: boolean;
  onUploadClose: () => void;
}

export default function FlicksPage({ uploadOpen: _uploadOpen, onUploadClose: _onUploadClose }: FlicksPageProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag');
  const navigate = useNavigate();

  const [tab, setTab] = useState<FeedTab>('foryou');
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [muted, setMuted] = useState(true);
  const [commentFlickId, setCommentFlickId] = useState<string | null>(null);
  const [shareFlick, setShareFlick] = useState<Flick | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const openFlickUpload = useUIStore((s) => s.openFlickUpload);
  const pageRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(false);

  usePageTitle(`${t('flicks.title')} | Sangam`);

  const loadFlicks = useCallback(
    async (page: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const { flicks: newFlicks, hasMore: more } = await fetchFlicks({
          page,
          hashtag: tag || undefined,
          feed: tab,
        });
        setFlicks((prev) => (replace ? newFlicks : [...prev, ...newFlicks]));
        setHasMore(more);
        pageRef.current = page;
      } catch {
        // ignore
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [tag, tab],
  );

  useEffect(() => {
    loadFlicks(0, true);
    setActiveIndex(0);
  }, [loadFlicks]);

  useEffect(() => {
    if (flicks.length === 0 || loadingMore || !hasMore) return;
    if (activeIndex >= flicks.length - 2) {
      loadFlicks(pageRef.current + 1, false);
    }
  }, [activeIndex, flicks.length, loadingMore, hasMore, loadFlicks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      setTimeout(() => { wheelLock.current = false; }, 500);
      if (e.deltaY > 0) setActiveIndex((i) => Math.min(i + 1, flicks.length - 1));
      else if (e.deltaY < 0) setActiveIndex((i) => Math.max(i - 1, 0));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [flicks.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') setActiveIndex((i) => Math.min(i + 1, flicks.length - 1));
      else if (e.key === 'ArrowUp') setActiveIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flicks.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: activeIndex * el.clientHeight, behavior: 'smooth' });
  }, [activeIndex]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
  }

  function changeTab(newTab: FeedTab) {
    setTab(newTab);
  }

  const tabs: { key: FeedTab; label: string }[] = [
    { key: 'foryou', label: t('flicks.forYou') },
    { key: 'following', label: t('flicks.following') },
    { key: 'trending', label: t('flicks.trending') },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 md:ml-64 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (flicks.length === 0) {
    return (
      <div className="fixed inset-0 md:ml-64 flex flex-col items-center justify-center bg-[#0b1220] text-center px-6">
        <p className="text-white/80 font-heading font-bold text-lg">
          {tag ? t('flicks.noFlicksTag', { tag }) : t('flicks.noFlicks')}
        </p>
        <p className="text-white/50 text-sm mt-1">
          {tag ? t('flicks.beFirst') : t('flicks.uploadToStart')}
        </p>
        <button
          onClick={openFlickUpload}
          className="mt-4 px-5 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> {t('flicks.newFlick')}
        </button>
        {tag && (
          <button
            onClick={() => navigate('/flicks')}
            className="mt-3 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-bold"
          >
            {t('flicks.backToFlicks')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:ml-64 bg-black overflow-hidden">
      {/* Top tabs */}
      {!tag && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-3 pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex gap-1 pointer-events-auto">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                onClick={() => changeTab(tb.key)}
                className={`px-4 py-1.5 text-sm font-bold transition-colors ${
                  tab === tb.key ? 'text-white' : 'text-white/50'
                }`}
              >
                {tb.label}
                {tab === tb.key && <span className="block h-0.5 w-6 mx-auto mt-1 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag banner */}
      {tag && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={() => { setSearchParams({}); }}
            className="h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-white font-heading font-bold">#{tag}</span>
        </div>
      )}

      {/* Floating upload button */}
      <button
        onClick={openFlickUpload}
        className="absolute right-4 top-20 z-20 h-12 w-12 rounded-full bg-sangam-gradient flex items-center justify-center shadow-lg shadow-coral-500/30 active:scale-90 transition-transform"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto reels-scroll no-scrollbar"
      >
        {flicks.map((flick, i) => (
          <div key={flick.id} className="h-full w-full reels-snap">
            <FlickCard
              flick={flick}
              isActive={i === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onOpenComments={() => setCommentFlickId(flick.id)}
              onEcho={() => setShareFlick(flick)}
              onShare={() => {}}
            />
          </div>
        ))}

        {loadingMore && (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        )}
      </div>

      {/* Comment sheet */}
      {commentFlickId && (
        <FlickCommentSheet
          flickId={commentFlickId}
          onClose={() => setCommentFlickId(null)}
        />
      )}

      {/* Echo / share sheet */}
      {shareFlick && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => { setShareFlick(null); setShareCopied(false); }}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl p-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('flicks.shareFlick')}</h2>
              <button
                onClick={() => { setShareFlick(null); setShareCopied(false); }}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/flicks?id=${shareFlick.id}`;
                  await navigator.clipboard.writeText(url);
                  setShareCopied(true);
                  setTimeout(() => { setShareFlick(null); setShareCopied(false); }, 1500);
                } catch { /* ignore */ }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-300 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
                <Plus className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {shareCopied ? t('flicks.copyLinkDone') : t('flicks.copyLink')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
