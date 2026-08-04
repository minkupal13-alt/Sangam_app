import { supabase } from './supabase';
import type { Post, Profile, Comment } from './types';

/**
 * Fetch posts from Supabase with author profiles, like/bookmark state,
 * and nested original-post data for reposts.
 */
export async function fetchPosts(opts: {
  page?: number;
  pageSize?: number;
  feedType?: 'following' | 'forYou';
  userId?: string;
}): Promise<{ posts: Post[]; hasMore: boolean }> {
  const { page = 0, pageSize = 10, feedType = 'forYou', userId } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('posts').select('*').order('created_at', { ascending: false });

  if (feedType === 'following' && userId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    const followingIds = (follows || []).map((f) => f.following_id);
    followingIds.push(userId);
    query = query.in(
      'user_id',
      followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000'],
    );
  }

  const { data: postsData, error } = await query.range(from, to);
  if (error) throw error;
  if (!postsData || postsData.length === 0) return { posts: [], hasMore: false };

  // Collect all user IDs (post authors + original post authors for reposts)
  const userIds = new Set<string>();
  postsData.forEach((p) => {
    userIds.add(p.user_id);
    if (p.repost_of) userIds.add(p.repost_of);
  });
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [...userIds]);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  // Fetch original posts for reposts
  const repostOfIds = postsData.filter((p) => p.repost_of).map((p) => p.repost_of as string);
  let originalPostsMap = new Map<string, Post>();
  if (repostOfIds.length > 0) {
    const { data: originals } = await supabase
      .from('posts')
      .select('*')
      .in('id', repostOfIds);
    (originals || []).forEach((o) => {
      originalPostsMap.set(o.id, { ...o, author: profileMap.get(o.user_id) });
    });
  }

  const postIds = postsData.map((p) => p.id);
  const { data: likes } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'post')
    .in('target_id', postIds);
  const likedIds = new Set((likes || []).map((l) => l.target_id));

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('post_id')
    .in('post_id', postIds);
  const bookmarkedIds = new Set((bookmarks || []).map((b) => b.post_id));

  const posts: Post[] = postsData.map((p) => ({
    ...p,
    author: profileMap.get(p.user_id),
    liked_by_me: likedIds.has(p.id),
    bookmarked_by_me: bookmarkedIds.has(p.id),
    original_post: p.repost_of ? originalPostsMap.get(p.repost_of) || null : null,
  }));

  return { posts, hasMore: postsData.length === pageSize };
}

export async function fetchSavedPosts(userId: string): Promise<Post[]> {
  const { data: bookmarks, error: bErr } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', userId);
  if (bErr) throw bErr;
  if (!bookmarks || bookmarks.length === 0) return [];

  const postIds = bookmarks.map((b) => b.post_id);
  const { data: postsData, error } = await supabase
    .from('posts')
    .select('*')
    .in('id', postIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!postsData || postsData.length === 0) return [];

  const userIds = [...new Set(postsData.map((p) => p.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const { data: likes } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'post')
    .in('target_id', postIds);
  const likedIds = new Set((likes || []).map((l) => l.target_id));

  return postsData.map((p) => ({
    ...p,
    author: profileMap.get(p.user_id),
    liked_by_me: likedIds.has(p.id),
    bookmarked_by_me: true,
    original_post: null,
  })) as Post[];
}

export async function toggleLike(postId: string, liked: boolean): Promise<void> {
  if (liked) {
    await supabase.from('likes').delete().eq('target_id', postId).eq('target_type', 'post');
  } else {
    await supabase.from('likes').insert({ target_id: postId, target_type: 'post' });
  }
}

export async function toggleBookmark(postId: string, bookmarked: boolean): Promise<void> {
  if (bookmarked) {
    await supabase.from('bookmarks').delete().eq('post_id', postId);
  } else {
    await supabase.from('bookmarks').insert({ post_id: postId });
  }
}

export async function createPost(
  content: string,
  mediaUrls: string[],
  mediaType: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .insert({ content, media_urls: mediaUrls, media_type: mediaType })
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function createRepost(originalPostId: string, caption: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      content: caption,
      media_urls: [],
      media_type: 'text',
      repost_of: originalPostId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function uploadMedia(file: File, folder: string, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('post-media').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  const comments: Comment[] = data.map((c) => ({
    ...c,
    author: profileMap.get(c.user_id),
  }));

  // Build nested structure
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
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

export async function addComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<void> {
  await supabase.from('comments').insert({
    post_id: postId,
    content,
    parent_comment_id: parentId || null,
  });
}
