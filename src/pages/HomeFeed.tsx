import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, Zap, Search, Bell, ArrowUp, Plus, UserPlus, Check, Users, Compass } from 'lucide-react';
import PostCard from '@/components/PostCard';
import PostCardSkeleton from '@/components/PostCardSkeleton';
import CommentSheet from '@/components/CommentSheet';
import ShareSheet from '@/components/ShareSheet';
import StoryRing from '@/components/StoryRing';
import StoryViewer from '@/components/StoryViewer';
import AddStoryModal from '@/components/AddStoryModal';
import SangamLogo from '@/components/SangamLogo';
import GreetingBar from '@/components/feed/GreetingBar';
import FlicksRow from '@/components/feed/FlicksRow';
import PeopleYouMayKnow from '@/components/feed/PeopleYouMayKnow';
import TrendingOnWatch from '@/components/feed/TrendingOnWatch';
import TrendingTopics from '@/components/feed/TrendingTopics';
import LiveNowBanner from '@/components/feed/LiveNowBanner';
import QuickActionButtons from '@/components/feed/QuickActionButtons';
import LiveRoomsWidget from '@/components/feed/LiveRoomsWidget';
import EventsWidget from '@/components/feed/EventsWidget';
import MarketplaceWidget from '@/components/feed/MarketplaceWidget';
import RightSidebar from '@/components/feed/RightSidebar';
import { fetchPosts, toggleLike, toggleBookmark } from '@/lib/feedApi';
import {
  fetchTrendingFlicks,
  fetchTrendingVideos,
  fetchSuggestedUsers,
  fetchTrendingTopics,
  fetchHomeStats,
  fetchLiveStreams,
  fetchLiveRooms,
  fetchUpcomingEvents,
  fetchMarketplacePicks,
  type LiveStream,
  type LiveRoom,
  type EventItem,
  type MarketplaceItem,
} from '@/lib/feedMixApi';
import { fetchStoryFeed, type StoryGroup, type Story } from '@/lib/storyApi';
import { useAuthStore } from '@/lib/authStore';
import { useUIStore } from '@/lib/uiStore';
import { useFeedStore } from '@/lib/feedStore';
import { supabase } from '@/lib/supabase';
import type { Post, Flick, Video, Profile } from '@/lib/types';
import { usePageTitle } from '@/lib/usePageTitle';

type WidgetType = 'flicks' | 'people' | 'watch' | 'topics' | 'liveRooms' | 'events' | 'marketplace';

interface WidgetSection {
  type: WidgetType;
  loading: boolean;
  flicks?: Flick[];
  videos?: Video[];
  suggestions?: { profile: Profile; mutualCount: number }[];
  topics?: { tag: string; count: number }[];
  liveRooms?: LiveRoom[];
  events?: EventItem[];
  marketplace?: MarketplaceItem[];
}

const WIDGET_PATTERN: { type: WidgetType; after: number }[] = [
  { type: 'flicks', after: 3 },
  { type: 'people', after: 2 },
  { type: 'watch', after: 3 },
  { type: 'topics', after: 2 },
  { type: 'events', after: 3 },
  { type: 'marketplace', after: 2 },
];

export default function HomeFeed() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const openCreate = useUIStore((s) => s.openCreate);
  const { posts, setPosts } = useFeedStore();
  const navigate = useNavigate();

  const [feed, setFeed] = useState<'forYou' | 'following'>('forYou');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [ownStories, setOwnStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [stats, setStats] = useState({ unreadNotifications: 0, newFollowers: 0 });
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetSection[]>([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [pullStart, setPullStart] = useState(0);
  const [pulling, setPulling] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  usePageTitle('Sangam — Everything. One Sangam.');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setPage(0);
    setNewPostsCount(0);
    try {
      const [postData, liveData] = await Promise.all([
        fetchPosts({ page: 0, feedType: feed, userId: profile?.id }),
        fetchLiveStreams(3),
      ]);
      setPosts(postData.posts);
      setHasMore(postData.hasMore);
      setLiveStreams(liveData);
      setLiveLoading(false);

      const initialWidgets: WidgetSection[] = WIDGET_PATTERN.map((w) => ({
        type: w.type,
        loading: true,
      }));
      setWidgets(initialWidgets);
      loadWidgetData(initialWidgets);
    } catch {
      setPosts([]);
    }
    setLoading(false);
  }, [feed, profile?.id, setPosts]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!profile) return;
    fetchHomeStats(profile.id).then(setStats).catch(() => {});
  }, [profile]);

  // Real-time new posts indicator
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('new-posts-indicator')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload: { new: { user_id: string } }) => {
          if (payload.new.user_id !== profile.id) {
            setNewPostsCount((c) => c + 1);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const loadStories = useCallback(async () => {
    if (!profile) return;
    setStoriesLoading(true);
    try {
      const { groups, ownStories: own } = await fetchStoryFeed(profile.id);
      setStoryGroups(groups);
      setOwnStories(own);
    } catch {
      setStoryGroups([]);
      setOwnStories([]);
    }
    setStoriesLoading(false);
  }, [profile]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  async function loadWidgetData(currentWidgets: WidgetSection[]) {
    const profileId = profile?.id;
    const results = await Promise.allSettled([
      fetchTrendingFlicks(6),
      fetchTrendingVideos(5),
      fetchLiveRooms(4),
      fetchUpcomingEvents(3),
      fetchMarketplacePicks(4),
      profileId ? fetchSuggestedUsers(profileId, 6) : Promise.resolve([]),
      fetchTrendingTopics(5),
    ]);

    setWidgets((prev) =>
      prev.map((w, i) => {
        const result = results[i];
        if (result.status !== 'fulfilled') return { ...w, loading: false };
        const data = result.value;
        switch (w.type) {
          case 'flicks':
            return { ...w, flicks: data as Flick[], loading: false };
          case 'watch':
            return { ...w, videos: data as Video[], loading: false };
          case 'liveRooms':
            return { ...w, liveRooms: data as LiveRoom[], loading: false };
          case 'events':
            return { ...w, events: data as EventItem[], loading: false };
          case 'marketplace':
            return { ...w, marketplace: data as MarketplaceItem[], loading: false };
          case 'people':
            return { ...w, suggestions: data as { profile: Profile; mutualCount: number }[], loading: false };
          case 'topics':
            return { ...w, topics: data as { tag: string; count: number }[], loading: false };
          default:
            return w;
        }
      }),
    );
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { posts: p, hasMore: hm } = await fetchPosts({ page: nextPage, feedType: feed, userId: profile?.id });
      setPosts([...posts, ...p]);
      setHasMore(hm);
      setPage(nextPage);
    } catch {
      setHasMore(false);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  function handleLike(post: Post) {
    setPosts(
      posts.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) }
          : p,
      ),
    );
    toggleLike(post.id, post.liked_by_me || false).catch(() => loadInitial());
  }

  function handleBookmark(post: Post) {
    setPosts(posts.map((p) => (p.id === post.id ? { ...p, bookmarked_by_me: !p.bookmarked_by_me } : p)));
    toggleBookmark(post.id, post.bookmarked_by_me || false).catch(() => {});
  }

  // Pull to refresh (mobile)
  function handleTouchStart(e: React.TouchEvent) {
    if (feedRef.current && feedRef.current.scrollTop === 0) {
      setPullStart(e.touches[0].clientY);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (pullStart && feedRef.current && feedRef.current.scrollTop === 0) {
      const diff = e.touches[0].clientY - pullStart;
      if (diff > 0 && diff < 120) {
        setPulling(true);
      }
    }
  }

  function handleTouchEnd() {
    if (pulling) {
      loadInitial();
    }
    setPullStart(0);
    setPulling(false);
  }

  function renderMixedFeed() {
    const elements: React.ReactNode[] = [];
    let widgetIdx = 0;
    let postsSinceLastWidget = 0;
    let nextWidgetAt = WIDGET_PATTERN[0]?.after || 3;

    for (let i = 0; i < posts.length; i++) {
      elements.push(
        <PostCard
          key={`post-${posts[i].id}`}
          post={posts[i]}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onComment={(post) => setCommentPost(post)}
          onShare={(post) => setSharePost(post)}
        />,
      );
      postsSinceLastWidget++;

      if (postsSinceLastWidget >= nextWidgetAt && widgetIdx < widgets.length) {
        const widget = widgets[widgetIdx];
        const widgetEl = renderWidget(widget, widgetIdx);
        if (widgetEl) elements.push(widgetEl);
        widgetIdx++;
        postsSinceLastWidget = 0;
        const nextPattern = WIDGET_PATTERN[widgetIdx % WIDGET_PATTERN.length];
        nextWidgetAt = nextPattern?.after || 3;
      }
    }

    return elements;
  }

  function renderWidget(section: WidgetSection, idx: number): React.ReactNode {
    const key = `widget-${idx}-${section.type}`;
    switch (section.type) {
      case 'flicks':
        return <FlicksRow key={key} flicks={section.flicks || []} loading={section.loading} />;
      case 'people':
        return <PeopleYouMayKnow key={key} suggestions={section.suggestions || []} loading={section.loading} />;
      case 'watch':
        return <TrendingOnWatch key={key} videos={section.videos || []} loading={section.loading} />;
      case 'topics':
        return <TrendingTopics key={key} topics={section.topics || []} loading={section.loading} />;
      case 'liveRooms':
        return <LiveRoomsWidget key={key} rooms={section.liveRooms || []} loading={section.loading} />;
      case 'events':
        return <EventsWidget key={key} events={section.events || []} loading={section.loading} />;
      case 'marketplace':
        return <MarketplaceWidget key={key} items={section.marketplace || []} loading={section.loading} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex">
      <div
        ref={feedRef}
        className="flex-1 min-w-0 max-w-2xl mx-auto w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {pulling && (
          <div className="flex justify-center py-3 animate-fadeIn">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}

        {/* New posts banner */}
        {newPostsCount > 0 && !loading && (
          <button
            onClick={loadInitial}
            className="sticky top-14 z-20 mx-auto mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-sangam-gradient text-white text-sm font-semibold shadow-lg shadow-brand-500/20 animate-slideDown"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            {newPostsCount} {t('feed.newPosts')} · {t('feed.tapToRefresh')}
          </button>
        )}

        {/* TOP BAR — mobile */}
        <div className="md:hidden sticky top-0 z-30 bg-[#fafaf9]/90 dark:bg-[#0b1220]/90 backdrop-blur-xl border-b border-gray-100 dark:border-navy-300">
          <div className="flex items-center justify-between px-4 py-2.5">
            <SangamLogo size={32} />
            <div className="flex items-center gap-2">
              <FeedTab active={feed === 'forYou'} onClick={() => setFeed('forYou')} icon={<Sparkles className="h-3.5 w-3.5" />} label={t('feed.discover')} />
              <FeedTab active={feed === 'following'} onClick={() => setFeed('following')} icon={<Zap className="h-3.5 w-3.5" />} label={t('feed.myCircle')} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/search')} className="text-gray-500 dark:text-gray-400">
                <Search className="h-5 w-5" />
              </button>
              <button onClick={() => navigate('/notifications')} className="text-gray-500 dark:text-gray-400 relative">
                <Bell className="h-5 w-5" />
                {stats.unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}
                  </span>
                )}
              </button>
              <img
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
                alt=""
                onClick={() => navigate(`/u/${profile?.username}`)}
                className="h-8 w-8 rounded-full object-cover cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* TOP BAR — desktop */}
        <div className="hidden md:flex sticky top-0 z-30 bg-[#fafaf9]/90 dark:bg-[#0b1220]/90 backdrop-blur-xl border-b border-gray-100 dark:border-navy-300">
          <div className="flex items-center justify-between px-4 py-2.5 w-full">
            <div className="flex items-center gap-1">
              <FeedTab active={feed === 'forYou'} onClick={() => setFeed('forYou')} icon={<Sparkles className="h-4 w-4" />} label={t('feed.discover')} />
              <FeedTab active={feed === 'following'} onClick={() => setFeed('following')} icon={<Zap className="h-4 w-4" />} label={t('feed.myCircle')} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/search')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <Search className="h-5 w-5" />
              </button>
              <button onClick={() => navigate('/notifications')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white relative">
                <Bell className="h-5 w-5" />
                {stats.unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}
                  </span>
                )}
              </button>
              <img
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
                alt=""
                onClick={() => navigate(`/u/${profile?.username}`)}
                className="h-8 w-8 rounded-full object-cover cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Stories row */}
        <StoryRing
          groups={storyGroups}
          ownStories={ownStories}
          loading={storiesLoading}
          onAddStory={() => setAddStoryOpen(true)}
          onOpenStory={(i) => {
            setStoryViewerIndex(i);
            setStoryViewerOpen(true);
          }}
          onOpenOwnStory={() => {
            setStoryViewerIndex(-1);
            setStoryViewerOpen(true);
          }}
        />

        {/* Live Now Banner */}
        <LiveNowBanner liveStreams={liveStreams} loading={liveLoading} />

        {/* Create post bar with avatar */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-300">
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
              alt=""
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <button
              onClick={openCreate}
              className="flex-1 text-start px-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-200 dark:hover:bg-navy-400 transition-colors"
            >
              {t('feed.whatsOnYourMind')}
            </button>
            <button
              onClick={openCreate}
              className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white active:scale-90 transition-transform shadow-md shadow-coral-500/20"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <QuickActionButtons onCreatePost={openCreate} onAddStory={() => setAddStoryOpen(true)} />

        {/* Greeting bar */}
        <GreetingBar
          unreadNotifications={stats.unreadNotifications}
          newFollowers={stats.newFollowers}
        />

        {/* Mixed feed */}
        <div>
          {loading ? (
            <div>
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              feed={feed}
              profileId={profile?.id}
              onExplore={() => navigate('/explore/people')}
              onCreate={openCreate}
              onFollowed={loadInitial}
              onOpenProfile={(username) => navigate(`/u/${username}`)}
              t={t}
            />
          ) : (
            renderMixedFeed()
          )}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && !loading && posts.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
          </div>
        )}

        <CommentSheet post={commentPost} onClose={() => setCommentPost(null)} />
        <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />

        {storyViewerOpen && (
          <StoryViewer
            groups={storyGroups}
            ownStories={ownStories}
            initialGroupIndex={storyViewerIndex < 0 ? 0 : storyViewerIndex}
            onClose={() => {
              setStoryViewerOpen(false);
              loadStories();
            }}
          />
        )}

        <AddStoryModal
          open={addStoryOpen}
          onClose={() => setAddStoryOpen(false)}
          onCreated={() => loadStories()}
        />
      </div>

      {/* Right sidebar (desktop only) */}
      <RightSidebar />
    </div>
  );
}

function FeedTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
        active
          ? 'bg-sangam-gradient text-white shadow-sm'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  feed,
  profileId,
  onExplore,
  onCreate,
  onFollowed,
  onOpenProfile,
  t,
}: {
  feed: 'forYou' | 'following';
  profileId?: string;
  onExplore: () => void;
  onCreate: () => void;
  onFollowed: () => void;
  onOpenProfile: (username: string) => void;
  t: (key: string) => string;
}) {
  const [suggestions, setSuggestions] = useState<{ profile: Profile; mutualCount: number }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingBusy, setFollowingBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    fetchSuggestedUsers(profileId, 8)
      .then((data) => { if (!cancelled) setSuggestions(data); })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setSuggestionsLoading(false); });
    return () => { cancelled = true; };
  }, [profileId]);

  async function handleFollow(targetId: string) {
    if (!profileId || followedIds.has(targetId) || followingBusy.has(targetId)) return;
    setFollowingBusy((prev) => new Set([...prev, targetId]));
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: profileId, following_id: targetId });
    setFollowingBusy((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
    if (!error) {
      setFollowedIds((prev) => new Set([...prev, targetId]));
      // Reload the feed so the newly followed user's posts appear.
      onFollowed();
    }
  }

  return (
    <div className="py-10 px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('feed.welcomeToSangam')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-balance max-w-md mx-auto">
          {t('feed.followPeople')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onExplore}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-coral-500/20"
          >
            <Compass className="h-4 w-4" />
            {t('feed.explorePeople')}
          </button>
          <button
            onClick={onCreate}
            className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-navy-400 transition-colors"
          >
            {t('feed.createPost')}
          </button>
        </div>
      </div>

      {/* Suggested users */}
      {(suggestionsLoading || suggestions.length > 0) && (
        <div className="mt-10 max-w-md mx-auto">
          <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white mb-3">
            {t('feed.explorePeople')}
          </h3>
          {suggestionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300">
                  <div className="h-11 w-11 rounded-full skeleton" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 rounded skeleton" />
                    <div className="h-3 w-20 rounded skeleton" />
                  </div>
                  <div className="h-8 w-20 rounded-full skeleton" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map(({ profile: p, mutualCount }) => {
                const isFollowed = followedIds.has(p.id);
                const isBusy = followingBusy.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300"
                  >
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`}
                      alt=""
                      onClick={() => onOpenProfile(p.username)}
                      className="h-11 w-11 rounded-full object-cover cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onOpenProfile(p.username)}
                        className="block text-start font-semibold text-sm text-gray-900 dark:text-white truncate hover:underline max-w-full"
                      >
                        {p.full_name}
                      </button>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {mutualCount > 0 ? `${mutualCount} mutual` : `${p.followers_count} followers`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFollow(p.id)}
                      disabled={isFollowed || isBusy}
                      className={`flex items-center justify-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${
                        isFollowed
                          ? 'bg-gray-200 dark:bg-navy-300 text-gray-500'
                          : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isFollowed ? (
                        <><Check className="h-3 w-3" /> {t('profile.following')}</>
                      ) : (
                        <><UserPlus className="h-3 w-3" /> {t('profile.follow')}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
