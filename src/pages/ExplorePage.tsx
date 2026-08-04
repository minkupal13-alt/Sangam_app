import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Play, Eye, Hash, TrendingUp, ArrowUp, ArrowDown, ChevronRight, Loader2, BadgeCheck, UserPlus, UserCheck } from 'lucide-react';
import type { Post, Flick, Video, Hashtag, Profile } from '@/lib/types';
import { fetchExploreContent, fetchFeaturedContent, fetchTrendingHashtags, fetchPeopleSuggestions } from '@/lib/searchApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

const CATEGORIES = ['all', 'photos', 'flicks', 'watch', 'people', 'trending', 'events', 'jobs', 'groups', 'podcasts', 'marketplace'] as const;
type Category = typeof CATEGORIES[number];

export default function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const myProfile = useAuthStore((s) => s.profile);
  const [category, setCategory] = useState<Category>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [featured, setFeatured] = useState<(Post | Flick | Video)[]>([]);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  usePageTitle(`${t('explore.title')} | Sangam`);

  const load = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    const [content, featuredContent, trendingTags, suggestedPeople] = await Promise.all([
      fetchExploreContent(category),
      fetchFeaturedContent(),
      fetchTrendingHashtags(10),
      fetchPeopleSuggestions().catch(() => []),
    ]);
    setPosts(content.posts);
    setFlicks(content.flicks);
    setVideos(content.videos);
    setFeatured(featuredContent);
    setTrending(trendingTags);
    setPeople(suggestedPeople.slice(0, 5));

    if (myProfile) {
      const { data: myFollowing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myProfile.id);
      setFollowingIds(new Set((myFollowing || []).map((f) => f.following_id)));
    }
    setLoading(false);
  }, [category, myProfile]);

  useEffect(() => { load(); }, [load]);

  // Auto-slide banner
  useEffect(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (featured.length <= 1) return;
    bannerTimerRef.current = setTimeout(() => {
      setBannerIndex((prev) => (prev + 1) % featured.length);
    }, 4000);
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, [bannerIndex, featured.length]);

  // Touch swipe for banner
  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || featured.length <= 1) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setBannerIndex((prev) => (prev - 1 + featured.length) % featured.length);
      else setBannerIndex((prev) => (prev + 1) % featured.length);
    }
    touchStartX.current = null;
  }

  // Build mixed grid items
  type GridItem = { id: string; type: 'post' | 'flick' | 'video'; data: Post | Flick | Video; large?: boolean };
  const allItems: GridItem[] = [];
  posts.forEach((p, i) => allItems.push({ id: `p-${p.id}`, type: 'post', data: p, large: i % 7 === 0 }));
  flicks.forEach((f, i) => allItems.push({ id: `f-${f.id}`, type: 'flick', data: f, large: i % 5 === 0 }));
  videos.forEach((v, i) => allItems.push({ id: `v-${v.id}`, type: 'video', data: v, large: i % 6 === 0 }));

  const visibleItems = allItems.slice(0, 20 + offset);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Load more from each source
    const newOffset = offset + 20;
    const extra = await fetchExploreContent(category);
    const moreItems = [...extra.posts, ...extra.flicks, ...extra.videos];
    if (moreItems.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    setOffset(newOffset);
    setLoadingMore(false);
  }

  function handleItemClick(item: GridItem) {
    if (item.type === 'post') navigate(`/u/${(item.data as Post).author?.username || ''}`);
    else if (item.type === 'flick') navigate('/flicks');
    else if (item.type === 'video') navigate(`/watch/${(item.data as Video).id}`);
  }

  async function handleFollow(userId: string) {
    if (!myProfile) return;
    await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: userId });
    setFollowingIds((prev) => new Set([...prev, userId]));
  }

  async function handleUnfollow(userId: string) {
    if (!myProfile) return;
    await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', userId);
    setFollowingIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Featured banner carousel */}
      {featured.length > 0 && (
        <div
          className="relative h-48 sm:h-64 rounded-3xl overflow-hidden mb-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {featured.map((item, i) => {
            const isPost = 'media_urls' in item;
            const isVideo = 'video_url' in item && 'title' in item;
            const isFlick = 'caption' in item && 'video_url' in item && !('title' in item);
            const bg = isPost ? (item as Post).media_urls?.[0] : (item as Flick | Video).thumbnail_url || '';
            const title = isVideo ? (item as Video).title : isPost ? (item as Post).content?.slice(0, 80) : (item as Flick).caption?.slice(0, 80);
            return (
              <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === bannerIndex ? 'opacity-100' : 'opacity-0'}`}>
                {bg && <img src={bg} alt="" className="h-full w-full object-cover" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-sangam-gradient text-white text-[10px] font-bold uppercase tracking-wide mb-2">
                    {isVideo ? t('explore.watch') : isFlick ? t('explore.flicks') : t('explore.featured')}
                  </span>
                  <p className="text-white font-heading font-bold text-sm sm:text-lg line-clamp-2">{title}</p>
                  {item.author && (
                    <div className="flex items-center gap-2 mt-2">
                      <img src={item.author.avatar_url || `https://ui-avatars.com/api/?name=${item.author.full_name}`} alt="" className="h-6 w-6 rounded-full object-cover" />
                      <span className="text-white/80 text-xs font-medium">{item.author.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Dots */}
          <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
            {featured.map((_, i) => (
              <button key={i} onClick={() => setBannerIndex(i)} className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
              category === cat
                ? 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            {t(`explore.${cat}`)}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Main grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-[150px] sm:auto-rows-[200px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`rounded-xl skeleton ${i % 7 === 0 ? 'row-span-2 col-span-2' : ''}`} />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 dark:text-navy-300 mb-3" />
              <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">{t('explore.nothingHere')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('explore.beFirst')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-[150px] sm:auto-rows-[200px]">
                {visibleItems.map((item) => {
                  const isPost = item.type === 'post';
                  const isVideo = item.type === 'video';
                  const post = item.data as Post;
                  const flick = item.data as Flick;
                  const video = item.data as Video;
                  const thumb = isPost ? post.media_urls?.[0] : (flick.thumbnail_url || video.thumbnail_url || '');
                  const likes = isPost ? post.likes_count : isVideo ? video.likes_count : flick.likes_count;
                  const comments = isPost ? post.comments_count : isVideo ? video.comments_count : flick.comments_count;
                  const views = isVideo ? video.views_count : isPost ? 0 : flick.views_count;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer group ${item.large ? 'row-span-2 col-span-2' : ''}`}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover lazy-blur" loading="lazy" />
                      ) : isPost ? (
                        <div className="h-full w-full bg-white dark:bg-navy-200 flex items-center justify-center p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4">{post.content}</p>
                        </div>
                      ) : (
                        <div className="h-full w-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
                          <Play className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1 text-white text-xs font-bold"><Heart className="h-4 w-4 fill-white" /> {formatCount(likes)}</span>
                        <span className="flex items-center gap-1 text-white text-xs font-bold"><MessageCircle className="h-4 w-4" /> {formatCount(comments)}</span>
                        {views > 0 && <span className="flex items-center gap-1 text-white text-xs font-bold"><Eye className="h-4 w-4" /> {formatCount(views)}</span>}
                      </div>
                      {(isVideo || item.type === 'flick') && (
                        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors flex items-center gap-2"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {loadingMore ? t('explore.loading') : t('explore.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right sidebar (desktop) */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            {/* Trending hashtags */}
            <div className="bg-white dark:bg-navy-200 rounded-2xl border border-gray-100 dark:border-navy-300 p-4">
              <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white mb-3">{t('explore.trendingOnSangam')}</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-12 rounded-lg skeleton" />))}
                </div>
              ) : trending.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">{t('explore.nothingHere')}</p>
              ) : (
                <div className="space-y-1">
                  {trending.map((tag, i) => (
                    <button
                      key={tag.id}
                      onClick={() => navigate(`/hashtag/${tag.tag_name}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-300/50 transition-colors text-left"
                    >
                      <span className="text-lg font-bold text-gray-300 dark:text-navy-300 w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{tag.tag_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{tag.category || ''}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{formatCount(tag.posts_count)} {t('explore.posts')}</span>
                        </div>
                      </div>
                      <span className="flex-shrink-0">
                        {(tag.trending_score || 0) > 0 ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-gray-400" />}
                      </span>
                    </button>
                  ))}
                  <button onClick={() => navigate('/explore/people')} className="w-full flex items-center justify-center gap-1 p-2 mt-2 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-xl transition-colors">
                    {t('explore.showMore')} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* People to follow */}
            <div className="bg-white dark:bg-navy-200 rounded-2xl border border-gray-100 dark:border-navy-300 p-4">
              <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white mb-3">{t('explore.peopleToFollow')}</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-12 rounded-lg skeleton" />))}
                </div>
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">{t('search.noSuggestionsAvailable')}</p>
              ) : (
                <div className="space-y-1">
                  {people.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-300/50 transition-colors">
                      <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name}`} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => navigate(`/u/${u.username}`)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span onClick={() => navigate(`/u/${u.username}`)} className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:underline truncate">{u.full_name}</span>
                          {u.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{formatCount(u.followers_count)} {t('search.followers')}</p>
                      </div>
                      <button
                        onClick={() => followingIds.has(u.id) ? handleUnfollow(u.id) : handleFollow(u.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform flex-shrink-0 ${
                          followingIds.has(u.id) ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300' : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                        }`}
                      >
                        {followingIds.has(u.id) ? t('explore.following') : t('explore.follow')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discover people banner */}
            <button onClick={() => navigate('/explore/people')} className="w-full p-4 rounded-2xl bg-sangam-gradient text-white text-left hover:shadow-md transition-shadow">
              <p className="font-heading font-bold text-sm">{t('explore.discoverPeople')}</p>
              <p className="text-xs text-white/80 mt-0.5">{t('explore.findCreators')}</p>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile trending (below grid) */}
      <div className="lg:hidden mt-4">
        <div className="bg-white dark:bg-navy-200 rounded-2xl border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white mb-3">{t('explore.trendingOnSangam')}</h2>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-1">
              {trending.slice(0, 5).map((tag, i) => (
                <button key={tag.id} onClick={() => navigate(`/hashtag/${tag.tag_name}`)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-300/50 transition-colors text-left">
                  <span className="text-base font-bold text-gray-300 dark:text-navy-300 w-5 text-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{tag.tag_name}</p>
                    <p className="text-xs text-gray-400">{formatCount(tag.posts_count)} {t('explore.posts')} · {tag.category || ''}</p>
                  </div>
                  {(tag.trending_score || 0) > 0 && <ArrowUp className="h-4 w-4 text-green-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
