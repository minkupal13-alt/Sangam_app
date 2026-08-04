import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Trash2, X, Pause, Play, Loader2 } from 'lucide-react';
import type { Video } from '@/lib/types';
import {
  fetchWatchHistory,
  clearWatchHistory,
  removeFromHistory,
  setHistoryPaused,
  getHistoryPaused,
} from '@/lib/watchApi';
import { formatCount, timeAgo } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

interface HistoryEntry {
  video: Video;
  watched_at: string;
}

export default function WatchHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);

  usePageTitle(`${t('watch.history')} | Sangam Watch`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { videos } = await fetchWatchHistory(0);
      // We need watched_at timestamps; fetchWatchHistory returns videos sorted by history
      // We'll use the order as proxy for watched_at
      const historyEntries: HistoryEntry[] = videos.map((v, i) => ({
        video: v,
        watched_at: v.created_at || new Date(Date.now() - i * 3600000).toISOString(),
      }));
      setEntries(historyEntries);
      const isPaused = await getHistoryPaused();
      setPaused(isPaused);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function groupByDate(items: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: Record<string, HistoryEntry[]> = {};
    items.forEach((item) => {
      const d = new Date(item.watched_at);
      let label: string;
      if (d >= today) label = t('watch.today');
      else if (d >= yesterday) label = t('watch.yesterday');
      else if (d >= weekAgo) label = t('watch.thisWeek');
      else label = t('watch.older');
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }

  function handleRemove(videoId: string) {
    setEntries((prev) => prev.filter((e) => e.video.id !== videoId));
    removeFromHistory(videoId).catch(() => {});
  }

  async function handleClearAll() {
    setEntries([]);
    await clearWatchHistory();
  }

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    await setHistoryPaused(next);
  }

  const filtered = entries.filter((e) =>
    e.video.title.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = groupByDate(filtered);

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">{t('watch.history')}</h1>
        <div className="flex-1" />
        <button
          onClick={togglePause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-navy-50 transition-colors"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? t('watch.resumeHistory') : t('watch.pauseHistory')}
        </button>
        {entries.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 text-sm font-medium hover:bg-coral-100 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('watch.clearHistory')}
          </button>
        )}
      </div>

      {paused && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
          {t('watch.historyPaused')}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('watch.searchHistory')}
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 font-heading font-bold text-lg">{t('watch.noHistory')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white text-sm mb-2">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((entry) => (
                  <div
                    key={entry.video.id}
                    className="flex gap-3 group cursor-pointer"
                    onClick={() => navigate(`/watch/${entry.video.id}`)}
                  >
                    <div className="relative w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-navy-300 flex-shrink-0">
                      <img
                        src={entry.video.thumbnail_url || ''}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {entry.video.duration_seconds > 0 && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                          {Math.floor(entry.video.duration_seconds / 60)}:{String(Math.floor(entry.video.duration_seconds % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {entry.video.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{entry.video.author?.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {formatCount(entry.video.views_count)} {t('watch.views')} · {t('watch.watchedAgo', { time: timeAgo(entry.watched_at) })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(entry.video.id); }}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-coral-500 hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
