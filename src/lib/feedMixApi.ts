import { supabase } from './supabase';
import type { Flick, Video, Profile } from './types';

/**
 * Fetch a small batch of trending flicks for the home feed mixed content.
 */
export async function fetchTrendingFlicks(limit = 6): Promise<Flick[]> {
  const { data, error } = await supabase
    .from('flicks')
    .select('*')
    .order('views_count', { ascending: false })
    .order('likes_count', { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  const userIds = [...new Set(data.map((f) => f.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  return data.map((f) => ({ ...f, author: profileMap.get(f.user_id) })) as Flick[];
}

/**
 * Fetch trending long-form videos for the home feed.
 */
export async function fetchTrendingVideos(limit = 5): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .in('visibility', ['public', 'unlisted'])
    .order('views_count', { ascending: false })
    .order('likes_count', { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  const userIds = [...new Set(data.map((v) => v.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  return data.map((v) => ({ ...v, author: profileMap.get(v.user_id) })) as Video[];
}

/**
 * Fetch suggested users to follow — users not already followed by the current user.
 * Includes mutual follower count.
 */
export async function fetchSuggestedUsers(
  currentUserId: string,
  limit = 6,
): Promise<{ profile: Profile; mutualCount: number }[]> {
  // Get users the current user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);
  const followingIds = new Set((following || []).map((f) => f.following_id));
  followingIds.add(currentUserId);

  // Fetch users not in following list, ordered by followers_count desc
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${[...followingIds].map((id) => `"${id}"`).join(',')})`)
    .order('followers_count', { ascending: false })
    .limit(limit);
  if (error || !profiles || profiles.length === 0) return [];

  // Compute mutual followers for each suggested user
  const result: { profile: Profile; mutualCount: number }[] = [];
  for (const p of profiles) {
    const { data: mutuals } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', p.id)
      .in('follower_id', [...followingIds]);
    result.push({
      profile: p as Profile,
      mutualCount: mutuals?.length || 0,
    });
  }
  return result;
}

/**
 * Fetch trending hashtags — top by posts_count, or derived from recent post content.
 */
export async function fetchTrendingTopics(limit = 5): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase
    .from('hashtags')
    .select('tag_name, posts_count')
    .order('posts_count', { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) {
    // Fallback: extract hashtags from recent posts
    const { data: posts } = await supabase
      .from('posts')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(50);
    const tagCounts = new Map<string, number>();
    (posts || []).forEach((p: { content: string }) => {
      const matches = p.content?.match(/#\w+/g) || [];
      matches.forEach((tag: string) => {
        const clean = tag.slice(1).toLowerCase();
        tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }
  return data.map((h) => ({ tag: h.tag_name, count: h.posts_count }));
}

export interface LiveStream {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  viewer_count: number;
  stream_title: string;
}

export interface LiveRoom {
  id: string;
  title: string;
  host_name: string;
  host_avatar: string | null;
  listener_count: number;
  topic: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendee_count: number;
  cover_url: string | null;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  price: string;
  image_url: string | null;
  seller: string;
  likes: number;
}

/**
 * Fetch live streams — currently returns trending videos as a proxy
 * since there's no dedicated live stream table yet.
 */
export async function fetchLiveStreams(limit = 3): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, user_id, title, views_count')
    .order('views_count', { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) return [];

  const userIds = [...new Set(data.map((v) => v.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  return data.map((v) => ({
    id: v.id,
    username: profileMap.get(v.user_id)?.username || 'user',
    full_name: profileMap.get(v.user_id)?.full_name || 'Creator',
    avatar_url: profileMap.get(v.user_id)?.avatar_url || null,
    viewer_count: Math.floor((v.views_count || 0) / 10) + 50,
    stream_title: v.title || 'Live stream',
  }));
}

/**
 * Fetch live audio rooms — mock data for now since there's no audio rooms table.
 */
export async function fetchLiveRooms(limit = 4): Promise<LiveRoom[]> {
  const topics = ['Music', 'Tech', 'Poetry', 'Comedy', 'Politics', 'Startups'];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .order('followers_count', { ascending: false })
    .limit(limit);
  if (!profiles || profiles.length === 0) return [];

  return profiles.map((p, i) => ({
    id: p.id,
    title: `${topics[i % topics.length]} talk with ${p.full_name}`,
    host_name: p.full_name,
    host_avatar: p.avatar_url,
    listener_count: Math.floor(Math.random() * 200) + 20,
    topic: topics[i % topics.length],
  }));
}

/**
 * Fetch upcoming events — mock data for now since there's no events table.
 */
export async function fetchUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const titles = ['Sangam Meetup', 'Open Mic Night', 'Poetry Reading', 'Art Exhibition', 'Tech Talk: AI Future'];
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Online', 'Pune'];
  const dates = ['JUL 30', 'AUG 5', 'AUG 12', 'AUG 20', 'SEP 1'];
  const times = ['7:00 PM', '6:30 PM', '8:00 PM', '5:00 PM', '9:00 PM'];

  return Array.from({ length: limit }).map((_, i) => ({
    id: `event-${i}`,
    title: titles[i % titles.length],
    date: dates[i % dates.length],
    time: times[i % times.length],
    location: locations[i % locations.length],
    attendee_count: Math.floor(Math.random() * 100) + 15,
    cover_url: null,
  }));
}

/**
 * Fetch marketplace picks — mock data for now since there's no marketplace table.
 */
export async function fetchMarketplacePicks(limit = 4): Promise<MarketplaceItem[]> {
  const titles = ['Vintage Camera', 'Handmade Pottery', 'Indie Book Set', 'Art Print', 'Vinyl Record', 'Leather Journal'];
  const prices = ['₹1,200', '₹850', '₹2,400', '₹600', '₹3,500', '₹450'];
  const sellers = ['Artisan Co.', 'BookNook', 'RetroHub', 'CraftyMe', 'VinylVault'];

  return Array.from({ length: limit }).map((_, i) => ({
    id: `item-${i}`,
    title: titles[i % titles.length],
    price: prices[i % prices.length],
    image_url: null,
    seller: sellers[i % sellers.length],
    likes: Math.floor(Math.random() * 50) + 5,
  }));
}

/**
 * Fetch Sangam points for a user — derived from engagement metrics.
 */
export async function fetchSangamPoints(userId: string): Promise<{ points: number; level: number; nextLevel: number }> {
  const [{ data: posts }, { data: flicks }, { data: videos }, { data: followers }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('flicks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
  ]);

  const postCount = posts?.length || 0;
  const flickCount = flicks?.length || 0;
  const videoCount = videos?.length || 0;
  const followerCount = followers?.length || 0;

  const points = postCount * 10 + flickCount * 25 + videoCount * 50 + followerCount * 5;
  const level = Math.floor(points / 500) + 1;
  const nextLevel = level * 500;

  return { points, level, nextLevel };
}

/**
 * Fetch quick stats for the greeting bar: unread notifications + new followers.
 */
export async function fetchHomeStats(userId: string): Promise<{
  unreadNotifications: number;
  newFollowers: number;
}> {
  const [{ data: notifs }, { data: follows }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId),
  ]);
  return {
    unreadNotifications: notifs?.length || 0,
    newFollowers: follows?.length || 0,
  };
}
