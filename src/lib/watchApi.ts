import { supabase } from './supabase';
import type { Video, VideoComment, Profile, Playlist } from './types';

const PAGE_SIZE = 12;

export const VIDEO_CATEGORIES = [
  'All',
  'Trending',
  'Music',
  'Gaming',
  'News',
  'Education',
  'Comedy',
  'Sports',
  'Food',
  'Travel',
  'Tech',
  'Movies',
  'Fitness',
  'Business',
  'DIY',
  'Entertainment',
] as const;

export async function fetchVideos(opts: {
  page?: number;
  category?: string;
  search?: string;
  channelId?: string;
  excludeId?: string;
}): Promise<{ videos: Video[]; hasMore: boolean }> {
  const { page = 0, category, search, channelId, excludeId } = opts;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });

  // Visibility: only public + unlisted for non-owners (RLS handles it but we
  // also filter client-side for the feed).
  query = query.in('visibility', ['public', 'unlisted']);

  if (channelId) {
    query = query.eq('user_id', channelId);
  }
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  if (category && category !== 'All' && category !== 'Trending') {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (category === 'Trending') {
    // Trending: order by engagement (views + likes) desc
    query = query.order('views_count', { ascending: false }).order('likes_count', { ascending: false });
  }

  const { data: rows, error } = await query.range(from, to);
  if (error) throw error;
  if (!rows || rows.length === 0) return { videos: [], hasMore: false };

  const videos = await enrichVideos(rows as Video[]);
  return { videos, hasMore: rows.length === PAGE_SIZE };
}

async function enrichVideos(rows: Video[]): Promise<Video[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const videoIds = rows.map((r) => r.id);
  const { data: reactions } = await supabase
    .from('video_reactions')
    .select('video_id, reaction_type')
    .in('video_id', videoIds);
  const reactionMap = new Map<string, 'like' | 'dislike'>();
  (reactions || []).forEach((r) => reactionMap.set(r.video_id, r.reaction_type));

  // Check subscription state for each video's channel
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id')
    .in('channel_id', userIds);
  const subbedIds = new Set((subs || []).map((s) => s.channel_id));

  return rows.map((r) => ({
    ...r,
    author: profileMap.get(r.user_id),
    my_reaction: reactionMap.get(r.id) || null,
    is_subscribed: subbedIds.has(r.user_id),
  }));
}

export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user_id)
    .maybeSingle();

  const { data: reaction } = await supabase
    .from('video_reactions')
    .select('reaction_type')
    .eq('video_id', id)
    .maybeSingle();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('channel_id', data.user_id)
    .maybeSingle();

  return {
    ...data,
    author: profile as Profile,
    my_reaction: (reaction?.reaction_type as 'like' | 'dislike') || null,
    is_subscribed: !!sub,
  };
}

export async function fetchRelatedVideos(video: Video): Promise<Video[]> {
  const { videos } = await fetchVideos({
    category: video.category || undefined,
    excludeId: video.id,
    page: 0,
  });
  // Also include videos from the same channel
  const { videos: channelVids } = await fetchVideos({
    channelId: video.user_id,
    excludeId: video.id,
    page: 0,
  });
  // Merge and dedupe, channel videos first
  const seen = new Set<string>();
  const merged: Video[] = [];
  [...channelVids, ...videos].forEach((v) => {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      merged.push(v);
    }
  });
  return merged.slice(0, 10);
}

export async function setVideoReaction(
  videoId: string,
  reaction: 'like' | 'dislike',
  current: 'like' | 'dislike' | null,
): Promise<void> {
  if (current === reaction) {
    // Toggle off
    await supabase.from('video_reactions').delete().eq('video_id', videoId);
  } else if (current) {
    // Switch reaction
    await supabase
      .from('video_reactions')
      .update({ reaction_type: reaction })
      .eq('video_id', videoId);
  } else {
    // New reaction
    await supabase.from('video_reactions').insert({ video_id: videoId, reaction_type: reaction });
  }
}

export async function toggleSubscription(channelId: string, subscribed: boolean): Promise<void> {
  if (subscribed) {
    await supabase
      .from('subscriptions')
      .delete()
      .eq('channel_id', channelId);
  } else {
    await supabase.from('subscriptions').insert({ channel_id: channelId });
  }
}

export async function fetchSubscribedVideos(page = 0): Promise<{ videos: Video[]; hasMore: boolean }> {
  const { data: subs, error: subErr } = await supabase
    .from('subscriptions')
    .select('channel_id')
    .order('created_at', { ascending: false });
  if (subErr) throw subErr;
  if (!subs || subs.length === 0) return { videos: [], hasMore: false };

  const channelIds = subs.map((s) => s.channel_id);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: rows, error } = await supabase
    .from('videos')
    .select('*')
    .in('user_id', channelIds)
    .in('visibility', ['public', 'unlisted'])
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  if (!rows || rows.length === 0) return { videos: [], hasMore: false };

  const videos = await enrichVideos(rows as Video[]);
  return { videos, hasMore: rows.length === PAGE_SIZE };
}

export async function fetchWatchHistory(page = 0): Promise<{ videos: Video[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: history, error: histErr } = await supabase
    .from('watch_history')
    .select('video_id, watched_at')
    .order('watched_at', { ascending: false })
    .range(from, to);
  if (histErr) throw histErr;
  if (!history || history.length === 0) return { videos: [], hasMore: false };

  const videoIds = history.map((h) => h.video_id);
  const { data: rows, error } = await supabase
    .from('videos')
    .select('*')
    .in('id', videoIds)
    .in('visibility', ['public', 'unlisted']);
  if (error) throw error;
  if (!rows || rows.length === 0) return { videos: [], hasMore: false };

  const videos = await enrichVideos(rows as Video[]);
  // Sort by history order
  const orderMap = new Map(history.map((h, i) => [h.video_id, i]));
  videos.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  return { videos, hasMore: history.length === PAGE_SIZE };
}

export async function recordWatchHistory(videoId: string, duration: number): Promise<void> {
  // Upsert: if row exists, update watched_at + duration
  const { data: existing } = await supabase
    .from('watch_history')
    .select('id')
    .eq('video_id', videoId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from('watch_history')
      .update({ watched_at: new Date().toISOString(), watch_duration: duration })
      .eq('id', existing.id);
  } else {
    await supabase.from('watch_history').insert({ video_id: videoId, watch_duration: duration });
  }
}

export async function fetchVideoComments(videoId: string, sort: 'top' | 'newest' = 'newest'): Promise<VideoComment[]> {
  let query = supabase
    .from('video_comments')
    .select('*')
    .eq('video_id', videoId);
  query = sort === 'newest'
    ? query.order('created_at', { ascending: false })
    : query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const commentIds = data.map((c) => c.id);
  const { data: likes } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'video_comment')
    .in('target_id', commentIds);
  const likedIds = new Set((likes || []).map((l) => l.target_id));

  const comments: VideoComment[] = data.map((c) => ({
    ...c,
    author: profileMap.get(c.user_id),
    liked_by_me: likedIds.has(c.id),
  }));

  const map = new Map<string, VideoComment>();
  const roots: VideoComment[] = [];
  comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  comments.forEach((c) => {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

export async function addVideoComment(
  videoId: string,
  content: string,
  parentId?: string,
): Promise<void> {
  await supabase.from('video_comments').insert({
    video_id: videoId,
    content,
    parent_comment_id: parentId || null,
  });
}

export async function toggleVideoCommentLike(commentId: string, liked: boolean): Promise<void> {
  if (liked) {
    await supabase
      .from('likes')
      .delete()
      .eq('target_id', commentId)
      .eq('target_type', 'video_comment');
  } else {
    await supabase.from('likes').insert({ target_id: commentId, target_type: 'video_comment' });
  }
}

export async function uploadWatchVideo(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('watch-videos')
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabase.storage.from('watch-videos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadWatchThumbnail(
  blob: Blob,
  userId: string,
): Promise<string> {
  const path = `${userId}-thumb-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('watch-videos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('watch-videos').getPublicUrl(path);
  return data.publicUrl;
}

export async function createVideo(opts: {
  videoUrl: string;
  thumbnailUrl: string | null;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  durationSeconds: number;
  commentsSetting?: 'allow' | 'hold' | 'disabled';
  scheduledAt?: string | null;
}): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      video_url: opts.videoUrl,
      thumbnail_url: opts.thumbnailUrl,
      title: opts.title,
      description: opts.description,
      category: opts.category,
      tags: opts.tags,
      visibility: opts.visibility,
      duration_seconds: opts.durationSeconds,
      comments_setting: opts.commentsSetting || 'allow',
      scheduled_at: opts.scheduledAt || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Video;
}

export async function fetchPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('watch_playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Playlist[];
}

export async function createPlaylist(name: string, visibility: 'public' | 'private'): Promise<Playlist | null> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('watch_playlists')
    .insert({ user_id: me.user.id, name, visibility })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Playlist;
}

export async function addToPlaylist(playlistId: string, videoId: string): Promise<void> {
  const { error } = await supabase
    .from('watch_playlist_items')
    .insert({ playlist_id: playlistId, video_id: videoId });
  if (error && error.code !== '23505') throw error;
}

export async function removeFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  const { error } = await supabase
    .from('watch_playlist_items')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId);
  if (error) throw error;
}

export async function fetchPlaylistVideos(playlistId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('watch_playlist_items')
    .select('video_id, position, videos(*)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw error;
  const rows = (data || []) as unknown as { video_id: string; position: number; videos: Video }[];
  const videoRows = rows.map((r) => r.videos).filter(Boolean);
  if (videoRows.length === 0) return [];
  return enrichVideos(videoRows);
}

export async function toggleWatchLater(videoId: string, remove?: boolean): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not authenticated');
  if (remove) {
    await supabase.from('watch_later').delete().eq('user_id', me.user.id).eq('video_id', videoId);
  } else {
    await supabase.from('watch_later').insert({ user_id: me.user.id, video_id: videoId });
  }
}

export async function fetchWatchLater(): Promise<Video[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data, error } = await supabase
    .from('watch_later')
    .select('video_id, videos(*)')
    .eq('user_id', me.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as unknown as { video_id: string; videos: Video }[];
  const videoRows = rows.map((r) => r.videos).filter(Boolean);
  if (videoRows.length === 0) return [];
  return enrichVideos(videoRows);
}

export async function fetchSubscriptionFeed(): Promise<Video[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id')
    .eq('subscriber_id', me.user.id);
  const ids = (subs || []).map((s) => s.channel_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .in('user_id', ids)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  return enrichVideos(data as Video[]);
}

export async function fetchSubscribedChannels(): Promise<Profile[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data, error } = await supabase
    .from('subscriptions')
    .select('channel_id, profiles!subscriptions_channel_id_fkey1(*)')
    .eq('subscriber_id', me.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as unknown as { channel_id: string; profiles: Profile }[];
  return rows.map((r) => r.profiles).filter(Boolean);
}

export async function clearWatchHistory(): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase.from('watch_history').delete().eq('user_id', me.user.id);
}

export async function removeFromHistory(videoId: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase.from('watch_history').delete().eq('user_id', me.user.id).eq('video_id', videoId);
}

export async function setHistoryPaused(paused: boolean): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase.from('profiles').update({ history_paused: paused }).eq('id', me.user.id);
}

export async function getHistoryPaused(): Promise<boolean> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return false;
  const { data } = await supabase.from('profiles').select('history_paused').eq('id', me.user.id).maybeSingle();
  return (data as { history_paused?: boolean } | null)?.history_paused ?? false;
}
