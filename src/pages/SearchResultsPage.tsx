import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Hash, BadgeCheck, Loader2, Heart, MessageCircle, Play, Eye, X, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import type { SearchResult, Profile, Post, Flick, Video, Hashtag } from '@/lib/types';
import { searchAll, addRecentSearch, saveSearchHistory } from '@/lib/searchApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

type Tab = 'top' | 'people' | 'posts' | 'flicks' | 'watch' | 'hashtags';

export default function SearchResultsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const query = searchParams.get('q') || '';
  const [tab, setTab] = useState<Tab>('top');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  usePageTitle(`${t('search.title')} | Sangam`);

  const load = useCallback(async () => {
    if (!query.trim()) {
      setResults({ users: [], posts: [], flicks: [], videos: [], hashtags: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setVisibleCount(20);
    addRecentSearch(query);
    saveSearchHistory(query);
    const data = await searchAll(query);
    setResults(data);

    if (profile) {
      const { data: myFollowing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id);
      setFollowingIds(new Set((myFollowing || []).map((f) => f.following_id)));
    }
    setLoading(false);
  }, [query, profile]);

  useEffect(() => { load(); }, [load]);

  async function handleFollow(userId: string) {
    if (!profile) return;
    await supabase.from('follows').insert({ follower_id: profile.id, following_id: userId });
    setFollowingIds((prev) => new Set([...prev, userId]));
  }

  async function handleUnfollow(userId: string) {
    if (!profile) return;
    await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', userId);
    setFollowingIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'top', label: t('search.top') },
    { key: 'people', label: t('search.people') },
    { key: 'posts', label: t('search.posts') },
    { key: 'flicks', label: t('search.flicks') },
    { key: 'watch', label: t('search.watch') },
    { key: 'hashtags', label: t('search.hashtags') },
  ];

  const hasAnyResult = results && (results.users.length > 0 || results.posts.length > 0 || results.flicks.length > 0 || results.videos.length > 0 || results.hashtags.length > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <h1 className="font-heading font-extrabold text-lg text-gray-900 dark:text-white truncate">
            {query || t('search.title')}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-[#fafaf9]/80 dark:bg-[#0b1220]/80 backdrop-blur-xl z-10 overflow-x-auto no-scrollbar">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); setVisibleCount(20); }}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap relative transition-colors ${
              tab === tb.key ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            }`}
          >
            {tb.label}
            {tab === tb.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-sangam-gradient" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <SearchSkeleton tab={tab} />
        ) : !hasAnyResult ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-navy-200 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-300 dark:text-navy-300" />
            </div>
            <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
              {t('search.noResultsFor')} "{query}"
            </p>
            <p className="text-gray-400 text-sm mt-1">{t('search.tryDifferent')}</p>
            <div className="mt-6 bg-gray-50 dark:bg-navy-300 rounded-2xl p-4 text-left">
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">{t('search.searchTips')}</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>· {t('search.tip1')}</li>
                <li>· {t('search.tip2')}</li>
                <li>· {t('search.tip3')}</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {tab === 'top' && (
              <div className="space-y-6">
                {results!.users.length > 0 && (
                  <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('search.people')}</h2>
                    <div className="space-y-2">
                      {results!.users.slice(0, 4).map((u) => (
                        <UserCard key={u.id} user={u} isFollowing={followingIds.has(u.id)} onFollow={handleFollow} onUnfollow={handleUnfollow} onClick={() => navigate(`/u/${u.username}`)} />
                      ))}
                    </div>
                  </section>
                )}
                {results!.hashtags.length > 0 && (
                  <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('search.hashtags')}</h2>
                    <div className="space-y-2">
                      {results!.hashtags.slice(0, 3).map((h) => (
                        <HashtagCard key={h.id} hashtag={h} onClick={() => navigate(`/hashtag/${h.tag_name}`)} />
                      ))}
                    </div>
                  </section>
                )}
                {results!.posts.length > 0 && (
                  <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('search.posts')}</h2>
                    <PostGrid posts={results!.posts.slice(0, 6)} onClick={(p) => navigate(`/u/${p.author?.username || ''}`)} />
                  </section>
                )}
                {results!.videos.length > 0 && (
                  <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('search.watch')}</h2>
                    <VideoGrid videos={results!.videos.slice(0, 4)} onClick={(v) => navigate(`/watch/${v.id}`)} />
                  </section>
                )}
                {results!.flicks.length > 0 && (
                  <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('search.flicks')}</h2>
                    <FlickGrid flicks={results!.flicks.slice(0, 6)} onClick={() => navigate('/flicks')} />
                  </section>
                )}
              </div>
            )}

            {tab === 'people' && (
              results!.users.length === 0 ? (
                <EmptyResult message={t('search.noResults')} />
              ) : (
                <>
                  <div className="space-y-2">
                    {results!.users.slice(0, visibleCount).map((u) => (
                      <UserCard key={u.id} user={u} isFollowing={followingIds.has(u.id)} onFollow={handleFollow} onUnfollow={handleUnfollow} onClick={() => navigate(`/u/${u.username}`)} />
                    ))}
                  </div>
                  {visibleCount < results!.users.length && (
                    <LoadMoreButton onClick={() => setVisibleCount((c) => c + 20)} label={t('explore.loadMore')} />
                  )}
                </>
              )
            )}

            {tab === 'posts' && (
              results!.posts.length === 0 ? (
                <EmptyResult message={t('search.noResults')} />
              ) : (
                <>
                  <PostGrid posts={results!.posts.slice(0, visibleCount)} onClick={(p) => navigate(`/u/${p.author?.username || ''}`)} />
                  {visibleCount < results!.posts.length && (
                    <LoadMoreButton onClick={() => setVisibleCount((c) => c + 20)} label={t('explore.loadMore')} />
                  )}
                </>
              )
            )}

            {tab === 'flicks' && (
              results!.flicks.length === 0 ? (
                <EmptyResult message={t('search.noResults')} />
              ) : (
                <>
                  <FlickGrid flicks={results!.flicks.slice(0, visibleCount)} onClick={() => navigate('/flicks')} />
                  {visibleCount < results!.flicks.length && (
                    <LoadMoreButton onClick={() => setVisibleCount((c) => c + 20)} label={t('explore.loadMore')} />
                  )}
                </>
              )
            )}

            {tab === 'watch' && (
              results!.videos.length === 0 ? (
                <EmptyResult message={t('search.noResults')} />
              ) : (
                <>
                  <VideoGrid videos={results!.videos.slice(0, visibleCount)} onClick={(v) => navigate(`/watch/${v.id}`)} />
                  {visibleCount < results!.videos.length && (
                    <LoadMoreButton onClick={() => setVisibleCount((c) => c + 20)} label={t('explore.loadMore')} />
                  )}
                </>
              )
            )}

            {tab === 'hashtags' && (
              results!.hashtags.length === 0 ? (
                <EmptyResult message={t('search.noResults')} />
              ) : (
                <div className="space-y-3">
                  {results!.hashtags.map((h) => (
                    <HashtagCardBig key={h.id} hashtag={h} onClick={() => navigate(`/hashtag/${h.tag_name}`)} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadMoreButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex justify-center mt-4">
      <button onClick={onClick} className="px-6 py-2.5 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors">
        {label}
      </button>
    </div>
  );
}

function EmptyResult({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Search className="h-10 w-10 text-gray-300 dark:text-navy-300 mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

function UserCard({ user, isFollowing, onFollow, onUnfollow, onClick }: {
  user: Profile; isFollowing: boolean; onFollow: (id: string) => void; onUnfollow: (id: string) => void; onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300">
      <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}`} alt="" onClick={onClick} className="h-12 w-12 rounded-full object-cover cursor-pointer flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span onClick={onClick} className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:underline truncate">{user.full_name}</span>
          {user.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
        {user.bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.bio}</p>}
        <p className="text-xs text-gray-400 mt-0.5">{formatCount(user.followers_count)} {t('search.followers')}</p>
      </div>
      <button
        onClick={() => (isFollowing ? onUnfollow(user.id) : onFollow(user.id))}
        className={`px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform flex-shrink-0 ${
          isFollowing ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300' : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
        }`}
      >
        {isFollowing ? t('explore.following') : t('explore.follow')}
      </button>
    </div>
  );
}

function HashtagCard({ hashtag, onClick }: { hashtag: Hashtag; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-300/50 transition-colors">
      <div className="h-11 w-11 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
        <Hash className="h-5 w-5 text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white">#{hashtag.tag_name}</p>
        <p className="text-xs text-gray-400">{formatCount(hashtag.posts_count)} {t('explore.posts')}</p>
      </div>
    </div>
  );
}

function HashtagCardBig({ hashtag, onClick }: { hashtag: Hashtag; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div onClick={onClick} className="p-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-14 w-14 rounded-2xl bg-sangam-gradient flex items-center justify-center flex-shrink-0">
          <Hash className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-heading font-extrabold text-gray-900 dark:text-white">#{hashtag.tag_name}</p>
          <p className="text-sm text-gray-400">{formatCount(hashtag.posts_count)} {t('explore.posts')}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="px-4 py-2 rounded-full bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform flex-shrink-0">
          {t('search.followHashtag')}
        </button>
      </div>
    </div>
  );
}

function PostGrid({ posts, onClick }: { posts: Post[]; onClick: (p: Post) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {posts.map((p) => (
        <div key={p.id} onClick={() => onClick(p)} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300 relative group cursor-pointer">
          {p.media_urls && p.media_urls.length > 0 ? (
            <img src={p.media_urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full flex items-center justify-center p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4">{p.content}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <span className="flex items-center gap-1 text-white text-xs font-bold"><Heart className="h-4 w-4 fill-white" /> {formatCount(p.likes_count)}</span>
            <span className="flex items-center gap-1 text-white text-xs font-bold"><MessageCircle className="h-4 w-4" /> {formatCount(p.comments_count)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlickGrid({ flicks, onClick }: { flicks: Flick[]; onClick: (f: Flick) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {flicks.map((f) => (
        <div key={f.id} onClick={() => onClick(f)} className="aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300 relative group cursor-pointer">
          {f.thumbnail_url ? <img src={f.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><Play className="h-6 w-6 text-gray-400" /></div>}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <div className="flex items-center gap-2 text-white text-[10px] font-bold">
              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 fill-white" /> {formatCount(f.likes_count)}</span>
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(f.views_count)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoGrid({ videos, onClick }: { videos: Video[]; onClick: (v: Video) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {videos.map((v) => (
        <div key={v.id} onClick={() => onClick(v)} className="rounded-2xl overflow-hidden bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 cursor-pointer hover:shadow-md transition-shadow">
          <div className="aspect-video bg-gray-100 dark:bg-navy-300 relative">
            {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><Play className="h-8 w-8 text-gray-400" /></div>}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-black/40 flex items-center justify-center"><Play className="h-6 w-6 text-white fill-white" /></div>
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{v.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{formatCount(v.views_count)} {t('search.views')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'posts' || tab === 'flicks' || tab === 'top') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="aspect-square rounded-xl skeleton" />))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded skeleton" />
            <div className="h-3 w-1/2 rounded skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
