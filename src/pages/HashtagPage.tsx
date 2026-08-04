import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Hash, Heart, MessageCircle, Play, Eye, Loader2 } from 'lucide-react';
import type { Post, Flick, Video, Hashtag } from '@/lib/types';
import {
  fetchHashtagByName,
  fetchPostsByHashtag,
  fetchFlicksByHashtag,
  fetchVideosByHashtag,
  toggleHashtagFollow,
  isFollowingHashtag,
  getHashtagFollowersCount,
} from '@/lib/searchApi';
import { formatCount } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

type Tab = 'top' | 'recent' | 'flicks' | 'watch';

export default function HashtagPage() {
  const { t } = useTranslation();
  const { tagname } = useParams<{ tagname: string }>();
  usePageTitle(tagname ? `#${tagname.replace(/^#/, '')} | Sangam` : 'Hashtag | Sangam');
  const navigate = useNavigate();
  const [hashtag, setHashtag] = useState<Hashtag | null>(null);
  const [tab, setTab] = useState<Tab>('top');
  const [posts, setPosts] = useState<Post[]>([]);
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);

  const load = useCallback(async () => {
    if (!tagname) return;
    setLoading(true);
    const cleanTag = tagname.replace(/^#/, '').toLowerCase();
    let tag = await fetchHashtagByName(cleanTag);

    if (!tag) {
      const { supabase } = await import('@/lib/supabase');
      const { data: newTag } = await supabase
        .from('hashtags')
        .insert({ tag_name: cleanTag, posts_count: 0 })
        .select('*')
        .single();
      tag = newTag as Hashtag;
    }

    setHashtag(tag);
    if (tag) {
      const [following, followers, postList, flickList, videoList] = await Promise.all([
        isFollowingHashtag(tag.id),
        getHashtagFollowersCount(tag.id),
        fetchPostsByHashtag(cleanTag, 'top'),
        fetchFlicksByHashtag(cleanTag),
        fetchVideosByHashtag(cleanTag),
      ]);
      setIsFollowing(following);
      setFollowersCount(followers);
      setPosts(postList);
      setFlicks(flickList);
      setVideos(videoList);
    }
    setLoading(false);
  }, [tagname]);

  useEffect(() => { load(); }, [load]);

  async function handleFollowToggle() {
    if (!hashtag) return;
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    setFollowersCount((prev) => prev + (newFollowState ? 1 : -1));
    await toggleHashtagFollow(hashtag.id, newFollowState);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'top', label: t('search.topPosts') },
    { key: 'recent', label: t('search.recent') },
    { key: 'flicks', label: t('search.flicks') },
    { key: 'watch', label: t('search.watch') },
  ];

  const totalContent = posts.length + flicks.length + videos.length;
  const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0) + flicks.reduce((sum, f) => sum + (f.views_count || 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500 mb-3">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-sangam-gradient flex items-center justify-center flex-shrink-0">
            <Hash className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white truncate">
              #{tagname?.replace(/^#/, '')}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{formatCount(totalContent)} {t('explore.posts')}</span>
              <span>·</span>
              <span>{formatCount(totalViews)} {t('search.views')}</span>
              <span>·</span>
              <span>{formatCount(followersCount)} {t('search.followers')}</span>
            </div>
          </div>
          <button
            onClick={handleFollowToggle}
            disabled={!hashtag}
            className={`px-5 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform flex-shrink-0 ${
              isFollowing ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300' : 'bg-sangam-gradient text-white shadow-md shadow-coral-500/20'
            }`}
          >
            {isFollowing ? t('search.unfollowHashtag') : t('search.followHashtag')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-[#fafaf9]/80 dark:bg-[#0b1220]/80 backdrop-blur-xl z-10 overflow-x-auto no-scrollbar mt-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="aspect-square rounded-xl skeleton" />))}
          </div>
        ) : (
          <>
            {(tab === 'top' || tab === 'recent') && (
              posts.length === 0 ? (
                <EmptyState message={t('search.noPostsWithTag')} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {posts.slice(0, visibleCount).map((p) => (
                      <div key={p.id} onClick={() => navigate(`/u/${p.author?.username || ''}`)} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300 relative group cursor-pointer">
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
                  {visibleCount < posts.length && (
                    <div className="flex justify-center mt-4">
                      <button onClick={() => setVisibleCount((c) => c + 20)} className="px-6 py-2.5 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors">
                        {t('explore.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              )
            )}

            {tab === 'flicks' && (
              flicks.length === 0 ? (
                <EmptyState message={t('search.noFlicksWithTag')} />
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {flicks.slice(0, visibleCount).map((f) => (
                      <div key={f.id} onClick={() => navigate('/flicks')} className="aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300 relative group cursor-pointer">
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
                  {visibleCount < flicks.length && (
                    <div className="flex justify-center mt-4">
                      <button onClick={() => setVisibleCount((c) => c + 20)} className="px-6 py-2.5 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors">
                        {t('explore.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              )
            )}

            {tab === 'watch' && (
              videos.length === 0 ? (
                <EmptyState message={t('search.noVideosWithTag')} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videos.slice(0, visibleCount).map((v) => (
                      <div key={v.id} onClick={() => navigate(`/watch/${v.id}`)} className="rounded-2xl overflow-hidden bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-gray-100 dark:bg-navy-300 relative">
                          {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><Play className="h-8 w-8 text-gray-400" /></div>}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-black/40 flex items-center justify-center"><Play className="h-6 w-6 text-white fill-white" /></div>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{v.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {v.author && (<><img src={v.author.avatar_url || `https://ui-avatars.com/api/?name=${v.author.full_name}`} alt="" className="h-4 w-4 rounded-full" /><span className="text-xs text-gray-400">{v.author.full_name}</span></>)}
                            <span className="text-xs text-gray-400">· {formatCount(v.views_count)} {t('search.views')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {visibleCount < videos.length && (
                    <div className="flex justify-center mt-4">
                      <button onClick={() => setVisibleCount((c) => c + 20)} className="px-6 py-2.5 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors">
                        {t('explore.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Hash className="h-12 w-12 text-gray-300 dark:text-navy-300 mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
