import { supabase } from './supabase';
import type { Profile, Post, Flick, Video, Hashtag, SearchResult, SearchSuggestion } from './types';

const RECENT_SEARCHES_KEY = 'sangam_recent_searches';

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches();
  const filtered = existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, 10);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export function removeRecentSearch(query: string): void {
  const existing = getRecentSearches();
  const updated = existing.filter((s) => s.toLowerCase() !== query.toLowerCase());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export async function saveSearchHistory(query: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user || !query.trim()) return;
  await supabase.from('search_history').insert({ user_id: me.user.id, query: query.trim() });
}

export async function getSearchHistory(): Promise<string[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data } = await supabase
    .from('search_history')
    .select('query')
    .eq('user_id', me.user.id)
    .order('searched_at', { ascending: false })
    .limit(10);
  return [...new Set((data || []).map((r) => r.query))];
}

/**
 * Real-time search suggestions as the user types.
 */
export async function fetchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const q = query.trim();
  const suggestions: SearchSuggestion[] = [];

  // Users (by name or username)
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(5);
  (users || []).forEach((u) => {
    suggestions.push({ type: 'user', user: u as Profile });
  });

  // Hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('*')
    .ilike('tag_name', `%${q}%`)
    .order('posts_count', { ascending: false })
    .limit(5);
  (hashtags || []).forEach((h) => {
    suggestions.push({ type: 'hashtag', hashtag: h as Hashtag });
  });

  // Posts (by content)
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .ilike('content', `%${q}%`)
    .limit(3);
  (posts || []).forEach((p) => {
    suggestions.push({ type: 'post', post: p as Post });
  });

  return suggestions;
}

/**
 * Full search across all content types.
 */
export async function searchAll(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { users: [], posts: [], flicks: [], videos: [], hashtags: [] };

  // Users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(20);
  const userList = (users || []) as Profile[];

  // Posts (with author)
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .or(`content.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`)
    .order('likes_count', { ascending: false })
    .limit(20);
  const postList = (posts || []) as unknown as Post[];

  // Flicks (by caption or tags)
  const { data: flicks } = await supabase
    .from('flicks')
    .select('*, author:profiles(*)')
    .or(`caption.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`)
    .order('likes_count', { ascending: false })
    .limit(20);
  const flickList = (flicks || []) as unknown as Flick[];

  // Videos (only public, by title/description/tags)
  const { data: videos } = await supabase
    .from('videos')
    .select('*, author:profiles(*)')
    .eq('visibility', 'public')
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`)
    .order('views_count', { ascending: false })
    .limit(20);
  const videoList = (videos || []) as unknown as Video[];

  // Hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('*')
    .ilike('tag_name', `%${q}%`)
    .order('posts_count', { ascending: false })
    .limit(20);
  const hashtagList = (hashtags || []) as Hashtag[];

  return {
    users: userList,
    posts: postList,
    flicks: flickList,
    videos: videoList,
    hashtags: hashtagList,
  };
}

/**
 * Fetch trending hashtags via the trending_hashtags() RPC.
 */
export async function fetchTrendingHashtags(limit = 10): Promise<Hashtag[]> {
  const { data, error } = await supabase.rpc('trending_hashtags', { lim: limit });
  if (error || !data) return [];
  return (data as Array<{ id: string; tag_name: string; posts_count: number; trending_score: number; category: string }>).map(
    (h) => ({
      id: h.id,
      tag_name: h.tag_name,
      posts_count: h.posts_count,
      trending_score: h.trending_score,
      category: h.category,
      created_at: new Date().toISOString(),
    }),
  );
}

/**
 * Fetch a hashtag by name (create if not exists).
 */
export async function fetchHashtagByName(tagName: string): Promise<Hashtag | null> {
  const { data } = await supabase
    .from('hashtags')
    .select('*')
    .eq('tag_name', tagName.toLowerCase())
    .maybeSingle();
  return data as Hashtag | null;
}

/**
 * Follow / unfollow a hashtag.
 */
export async function toggleHashtagFollow(hashtagId: string, follow: boolean): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  if (follow) {
    await supabase.from('hashtag_follows').insert({ user_id: me.user.id, hashtag_id: hashtagId });
  } else {
    await supabase.from('hashtag_follows').delete().eq('user_id', me.user.id).eq('hashtag_id', hashtagId);
  }
}

/**
 * Check if the current user follows a hashtag.
 */
export async function isFollowingHashtag(hashtagId: string): Promise<boolean> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return false;
  const { data } = await supabase
    .from('hashtag_follows')
    .select('id')
    .eq('user_id', me.user.id)
    .eq('hashtag_id', hashtagId)
    .maybeSingle();
  return !!data;
}

/**
 * Get follower count for a hashtag.
 */
export async function getHashtagFollowersCount(hashtagId: string): Promise<number> {
  const { count } = await supabase
    .from('hashtag_follows')
    .select('*', { count: 'exact', head: true })
    .eq('hashtag_id', hashtagId);
  return count || 0;
}

/**
 * Fetch posts tagged with a hashtag.
 */
export async function fetchPostsByHashtag(tagName: string, sort: 'top' | 'recent' = 'top'): Promise<Post[]> {
  const tag = tagName.toLowerCase();
  let query = supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .contains('tags', [tag]);
  if (sort === 'top') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  const { data } = await query.limit(50);
  return (data || []) as unknown as Post[];
}

/**
 * Fetch flicks tagged with a hashtag.
 */
export async function fetchFlicksByHashtag(tagName: string): Promise<Flick[]> {
  const tag = tagName.toLowerCase();
  const { data } = await supabase
    .from('flicks')
    .select('*, author:profiles(*)')
    .contains('tags', [tag])
    .order('likes_count', { ascending: false })
    .limit(50);
  return (data || []) as unknown as Flick[];
}

/**
 * Fetch videos tagged with a hashtag (public only).
 */
export async function fetchVideosByHashtag(tagName: string): Promise<Video[]> {
  const tag = tagName.toLowerCase();
  const { data } = await supabase
    .from('videos')
    .select('*, author:profiles(*)')
    .eq('visibility', 'public')
    .contains('tags', [tag])
    .order('views_count', { ascending: false })
    .limit(50);
  return (data || []) as unknown as Video[];
}

/**
 * Fetch explore content — mixed grid of posts, flicks, videos.
 */
export async function fetchExploreContent(category: string = 'all'): Promise<{
  posts: Post[];
  flicks: Flick[];
  videos: Video[];
}> {
  let posts: Post[] = [];
  let flicks: Flick[] = [];
  let videos: Video[] = [];

  if (category === 'all' || category === 'photos' || category === 'trending') {
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .neq('media_type', 'text')
      .order('likes_count', { ascending: false })
      .limit(20);
    posts = (data || []) as unknown as Post[];
  }

  if (category === 'all' || category === 'flicks' || category === 'trending') {
    const { data } = await supabase
      .from('flicks')
      .select('*, author:profiles(*)')
      .order('likes_count', { ascending: false })
      .limit(20);
    flicks = (data || []) as unknown as Flick[];
  }

  if (category === 'all' || category === 'watch' || category === 'trending') {
    const { data } = await supabase
      .from('videos')
      .select('*, author:profiles(*)')
      .eq('visibility', 'public')
      .order('views_count', { ascending: false })
      .limit(20);
    videos = (data || []) as unknown as Video[];
  }

  return { posts, flicks, videos };
}

/**
 * Fetch featured/trending content for the explore banner carousel.
 */
export async function fetchFeaturedContent(): Promise<(Post | Flick | Video)[]> {
  const [postsRes, flicksRes, videosRes] = await Promise.all([
    supabase.from('posts').select('*, author:profiles(*)').neq('media_type', 'text').order('likes_count', { ascending: false }).limit(2),
    supabase.from('flicks').select('*, author:profiles(*)').order('views_count', { ascending: false }).limit(1),
    supabase.from('videos').select('*, author:profiles(*)').eq('visibility', 'public').order('views_count', { ascending: false }).limit(2),
  ]);

  const items: (Post | Flick | Video)[] = [];
  (postsRes.data || []).forEach((p) => items.push(p as Post));
  (flicksRes.data || []).forEach((f) => items.push(f as Flick));
  (videosRes.data || []).forEach((v) => items.push(v as Video));
  return items.slice(0, 4);
}

/**
 * People you might know — based on mutual connections.
 */
export async function fetchPeopleSuggestions(): Promise<(Profile & { mutual_count?: number })[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];

  // Get people I follow
  const { data: myFollowing } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', me.user.id);
  const myFollowingSet = new Set((myFollowing || []).map((f) => f.following_id));
  myFollowingSet.add(me.user.id);

  // Get people my followings follow (excluding people I already follow)
  if (myFollowing && myFollowing.length > 0) {
    const { data: secondDegree } = await supabase
      .from('follows')
      .select('following_id, follower_id')
      .in('follower_id', myFollowing.map((f) => f.following_id))
      .not('following_id', 'in', `(${[...myFollowingSet].map((id) => `'${id}'`).join(',')})`);

    // Count mutual connections per suggested user
    const mutualCounts = new Map<string, number>();
    (secondDegree || []).forEach((f) => {
      mutualCounts.set(f.following_id, (mutualCounts.get(f.following_id) || 0) + 1);
    });

    // Get profiles for top suggestions
    const suggestedIds = [...mutualCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    if (suggestedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', suggestedIds);
      return (profiles || []).map((p) => ({
        ...(p as Profile),
        mutual_count: mutualCounts.get((p as Profile).id) || 0,
      }));
    }
  }

  // Fallback: trending creators (most followers)
  const { data: trendingProfiles } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', me.user.id)
    .limit(10);
  return (trendingProfiles || []) as Profile[];
}

/**
 * Trending creators — users with most followers this week.
 */
export async function fetchTrendingCreators(): Promise<Profile[]> {
  const { data: me } = await supabase.auth.getUser();

  // Get newest follows in last 7 days, count per following_id
  const { data: recentFollows } = await supabase
    .from('follows')
    .select('following_id')
    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const counts = new Map<string, number>();
  (recentFollows || []).forEach((f) => {
    counts.set(f.following_id, (counts.get(f.following_id) || 0) + 1);
  });

  const sortedIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)
    .filter((id) => id !== me.user?.id);

  if (sortedIds.length === 0) {
    // Fallback: just get some profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', me.user?.id || '')
      .limit(5);
    return (profiles || []) as Profile[];
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', sortedIds);
  return (profiles || []) as Profile[];
}
