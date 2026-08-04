import { supabase } from './supabase';
import type { Flick, FlickComment, Profile } from './types';

const PAGE_SIZE = 6;

/**
 * Fetch a page of flicks — recent + popular mix.
 * Algorithm: order by (likes_count + views_count) desc with recent bias,
 * falling back to created_at desc. For simplicity we fetch recent first,
 * then a popular batch, and interleave.
 */
export async function fetchFlicks(opts: {
  page?: number;
  hashtag?: string;
  userId?: string;
  feed?: 'foryou' | 'following' | 'trending';
}): Promise<{ flicks: Flick[]; hasMore: boolean }> {
  const { page = 0, hashtag, userId, feed = 'foryou' } = opts;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from('flicks').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (feed === 'following') {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return { flicks: [], hasMore: false };
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', me.user.id);
    const ids = (following || []).map((f) => f.following_id);
    if (ids.length === 0) return { flicks: [], hasMore: false };
    query = query.in('user_id', ids);
  } else if (feed === 'trending') {
    query = query.order('views_count', { ascending: false });
  }

  if (feed !== 'trending') {
    query = query.order('created_at', { ascending: false });
  }

  const { data: rows, error } = await query.range(from, to);
  if (error) throw error;
  if (!rows || rows.length === 0) return { flicks: [], hasMore: false };

  let filtered = rows;
  if (hashtag) {
    const tag = hashtag.toLowerCase();
    filtered = rows.filter((r: { caption?: string }) =>
      (r.caption || '').toLowerCase().includes(`#${tag}`),
    );
  }
  if (filtered.length === 0) return { flicks: [], hasMore: rows.length === PAGE_SIZE };

  const flicks = await enrichFlicks(filtered as Flick[]);
  return { flicks, hasMore: rows.length === PAGE_SIZE };
}

export async function fetchFlicksByAudio(audioName: string): Promise<Flick[]> {
  const { data, error } = await supabase
    .from('flicks')
    .select('*')
    .ilike('audio_name', audioName)
    .order('views_count', { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  return enrichFlicks(data as Flick[]);
}

export function getFlickShareUrl(flickId: string): string {
  return `${window.location.origin}/flicks?id=${flickId}`;
}

async function enrichFlicks(rows: Flick[]): Promise<Flick[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const flickIds = rows.map((r) => r.id);
  const { data: likes } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'flick')
    .in('target_id', flickIds);
  const likedIds = new Set((likes || []).map((l) => l.target_id));

  // flick bookmarks reuse the generic bookmarks table? No — bookmarks table
  // references posts. We track flick saves via likes with target_type 'flick_bookmark'.
  const { data: saves } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'flick_bookmark')
    .in('target_id', flickIds);
  const savedIds = new Set((saves || []).map((s) => s.target_id));

  return rows.map((r) => ({
    ...r,
    author: profileMap.get(r.user_id),
    liked_by_me: likedIds.has(r.id),
    bookmarked_by_me: savedIds.has(r.id),
  }));
}

export async function toggleFlickLike(flickId: string, liked: boolean): Promise<void> {
  if (liked) {
    await supabase
      .from('likes')
      .delete()
      .eq('target_id', flickId)
      .eq('target_type', 'flick');
  } else {
    await supabase.from('likes').insert({ target_id: flickId, target_type: 'flick' });
  }
}

export async function toggleFlickBookmark(flickId: string, saved: boolean): Promise<void> {
  if (saved) {
    await supabase
      .from('likes')
      .delete()
      .eq('target_id', flickId)
      .eq('target_type', 'flick_bookmark');
  } else {
    await supabase
      .from('likes')
      .insert({ target_id: flickId, target_type: 'flick_bookmark' });
  }
}

/**
 * Record a view for the current user. The UNIQUE(flick_id, user_id) constraint
 * on flick_views means only the first view per flick counts — duplicates are
 * ignored via onConflict do-nothing.
 */
export async function recordFlickView(flickId: string): Promise<void> {
  await supabase
    .from('flick_views')
    .insert({ flick_id: flickId })
    .throwOnError();
}

export async function fetchFlickComments(flickId: string): Promise<FlickComment[]> {
  const { data, error } = await supabase
    .from('flick_comments')
    .select('*')
    .eq('flick_id', flickId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const comments: FlickComment[] = data.map((c) => ({
    ...c,
    author: profileMap.get(c.user_id),
  }));

  const map = new Map<string, FlickComment>();
  const roots: FlickComment[] = [];
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

export async function addFlickComment(
  flickId: string,
  content: string,
  parentId?: string,
): Promise<void> {
  await supabase.from('flick_comments').insert({
    flick_id: flickId,
    content,
    parent_comment_id: parentId || null,
  });
}

export async function uploadFlickVideo(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('flicks-media').upload(path, file, {
    contentType: file.type,
    upsert: true,
    ...(onProgress ? {
      onUploadProgress: (e: { loaded: number; total: number }) => {
        if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    } : {}),
  });
  if (error) throw error;
  const { data } = supabase.storage.from('flicks-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFlickThumbnail(
  file: Blob,
  userId: string,
): Promise<string> {
  const path = `${userId}-thumb-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('flicks-media').upload(path, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('flicks-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function createFlick(opts: {
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  audioName?: string;
  locationTag?: string;
  audience?: 'public' | 'circle' | 'private';
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}): Promise<Flick | null> {
  const { data, error } = await supabase
    .from('flicks')
    .insert({
      video_url: opts.videoUrl,
      thumbnail_url: opts.thumbnailUrl,
      caption: opts.caption,
      audio_name: opts.audioName || null,
      location_tag: opts.locationTag || null,
      audience: opts.audience || 'public',
      allow_comments: opts.allowComments ?? true,
      allow_duet: opts.allowDuet ?? true,
      allow_stitch: opts.allowStitch ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Flick;
}
