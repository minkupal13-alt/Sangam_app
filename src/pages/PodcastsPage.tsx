import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Plus, Loader2, X, Search, Rss, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';

interface Podcast {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
  subscriber_count?: number;
}

const CATEGORIES = ['Technology', 'Business', 'Comedy', 'News', 'Health', 'Education', 'True Crime', 'Music', 'Sports', 'Politics'];

export default function PodcastsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subLoading, setSubLoading] = useState<Set<string>>(new Set());

  usePageTitle('Podcasts | Sangam');

  useEffect(() => {
    loadPodcasts();
  }, [profile]);

  async function loadPodcasts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('loadPodcasts error', error);
    }

    let podcastsWithCounts: Podcast[] = [];
    if (data) {
      podcastsWithCounts = await Promise.all(
        (data as Podcast[]).map(async (p) => {
          const { count } = await supabase
            .from('podcast_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('podcast_id', p.id);
          return { ...p, subscriber_count: count || 0 };
        }),
      );
      setPodcasts(podcastsWithCounts);
    }

    // Load user's subscriptions
    if (profile) {
      const { data: subs } = await supabase
        .from('podcast_subscriptions')
        .select('podcast_id')
        .eq('user_id', profile.id);
      setSubscribedIds(new Set((subs || []).map((s) => s.podcast_id)));
    }

    setLoading(false);
  }

  async function handleSubscribe(podcastId: string) {
    if (!profile) return;
    setSubLoading((prev) => new Set([...prev, podcastId]));
    const { error } = await supabase.from('podcast_subscriptions').insert({
      podcast_id: podcastId,
      user_id: profile.id,
    });
    if (!error) {
      setSubscribedIds((prev) => new Set([...prev, podcastId]));
      setPodcasts((prev) =>
        prev.map((p) =>
          p.id === podcastId ? { ...p, subscriber_count: (p.subscriber_count || 0) + 1 } : p,
        ),
      );
    }
    setSubLoading((prev) => {
      const next = new Set(prev);
      next.delete(podcastId);
      return next;
    });
  }

  async function handleUnsubscribe(podcastId: string) {
    if (!profile) return;
    setSubLoading((prev) => new Set([...prev, podcastId]));
    const { error } = await supabase
      .from('podcast_subscriptions')
      .delete()
      .eq('podcast_id', podcastId)
      .eq('user_id', profile.id);
    if (!error) {
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        next.delete(podcastId);
        return next;
      });
      setPodcasts((prev) =>
        prev.map((p) =>
          p.id === podcastId ? { ...p, subscriber_count: Math.max(0, (p.subscriber_count || 0) - 1) } : p,
        ),
      );
    }
    setSubLoading((prev) => {
      const next = new Set(prev);
      next.delete(podcastId);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const cover_url = formData.get('cover_url') as string;
    const category = formData.get('category') as string;

    if (!title.trim()) return;

    const { error } = await supabase.from('podcasts').insert({
      title: title.trim(),
      description: description.trim() || null,
      cover_url: cover_url.trim() || null,
      category: category || null,
      created_by: profile.id,
    });

    if (error) {
      console.error('create podcast error', error);
      return;
    }

    setShowCreate(false);
    form.reset();
    loadPodcasts();
  }

  const filtered = podcasts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Mic className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Podcasts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Channel</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search podcasts..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <Mic className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
            {search ? 'No podcasts found' : 'No podcasts yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Try a different search term.' : 'Create the first podcast channel!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((podcast) => {
            const isSubscribed = subscribedIds.has(podcast.id);
            const isLoading = subLoading.has(podcast.id);
            return (
              <div
                key={podcast.id}
                className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  {/* Cover art */}
                  <div
                    onClick={() => navigate(`/podcasts/${podcast.id}`)}
                    className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-gray-100 dark:bg-navy-300"
                  >
                    {podcast.cover_url ? (
                      <img src={podcast.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                        <Mic className="h-8 w-8 text-white/80" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => navigate(`/podcasts/${podcast.id}`)}
                        className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                      >
                        {podcast.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {podcast.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <Rss className="h-3 w-3" />
                        {formatCount(podcast.subscriber_count || 0)} subscribers
                        {podcast.category && (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-navy-300 font-medium">
                            {podcast.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Subscribe button */}
                {profile && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => (isSubscribed ? handleUnsubscribe(podcast.id) : handleSubscribe(podcast.id))}
                      disabled={isLoading}
                      className={`w-full py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5 ${
                        isSubscribed
                          ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                          : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isSubscribed ? (
                        <>
                          <BellOff className="h-3.5 w-3.5" />
                          Unsubscribe
                        </>
                      ) : (
                        <>
                          <Rss className="h-3.5 w-3.5" />
                          Subscribe
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
              <button
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">Create Channel</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Channel Title
                </label>
                <input
                  name="title"
                  required
                  placeholder="My Podcast"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What is your podcast about?"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cover Art URL
                </label>
                <input
                  name="cover_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
              >
                Create Channel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
