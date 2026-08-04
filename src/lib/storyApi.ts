import { supabase } from './supabase';
import type { Profile } from './types';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'text';
  caption: string | null;
  bg_gradient: string | null;
  created_at: string;
  expires_at: string;
  author?: Profile;
  viewed_by_me?: boolean;
}

export interface StoryGroup {
  user: Profile;
  stories: Story[];
  has_unseen: boolean;
}

/**
 * Fetch active stories from users the current user follows + own stories.
 * Groups by user. Marks which groups have unseen stories.
 */
export async function fetchStoryFeed(userId: string): Promise<{ groups: StoryGroup[]; ownStories: Story[] }> {
  // Get who the user follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  const followingIds = (follows || []).map((f) => f.following_id);
  followingIds.push(userId); // include own stories

  // Fetch active (non-expired) stories from these users
  const { data: storiesData, error } = await supabase
    .from('stories')
    .select('*')
    .in('user_id', followingIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!storiesData || storiesData.length === 0) return { groups: [], ownStories: [] };

  // Fetch author profiles
  const userIds = [...new Set(storiesData.map((s) => s.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  // Fetch my viewed stories
  const storyIds = storiesData.map((s) => s.id);
  const { data: myViews } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', userId)
    .in('story_id', storyIds);
  const viewedIds = new Set((myViews || []).map((v) => v.story_id));

  const allStories: Story[] = storiesData.map((s) => ({
    ...s,
    author: profileMap.get(s.user_id),
    viewed_by_me: viewedIds.has(s.id),
  }));

  // Group by user
  const ownStories = allStories.filter((s) => s.user_id === userId);
  const otherGroups: StoryGroup[] = [];

  const byUser = new Map<string, Story[]>();
  allStories
    .filter((s) => s.user_id !== userId)
    .forEach((s) => {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    });

  byUser.forEach((stories, uid) => {
    const user = profileMap.get(uid);
    if (!user) return;
    otherGroups.push({
      user,
      stories,
      has_unseen: stories.some((s) => !s.viewed_by_me),
    });
  });

  // Sort: unseen groups first, then by most recent
  otherGroups.sort((a, b) => {
    if (a.has_unseen !== b.has_unseen) return a.has_unseen ? -1 : 1;
    const aTime = Math.max(...a.stories.map((s) => +new Date(s.created_at)));
    const bTime = Math.max(...b.stories.map((s) => +new Date(s.created_at)));
    return bTime - aTime;
  });

  return { groups: otherGroups, ownStories };
}

export async function createStory(opts: {
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  caption?: string;
  bgGradient?: string;
}): Promise<void> {
  const { error } = await supabase.from('stories').insert({
    media_url: opts.mediaUrl || '',
    media_type: opts.mediaType,
    caption: opts.caption || null,
    bg_gradient: opts.bgGradient || null,
  });
  if (error) throw error;
}

export async function uploadStoryMedia(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('stories').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('stories').getPublicUrl(path);
  return data.publicUrl;
}

export async function markStoryViewed(storyId: string): Promise<void> {
  await supabase
    .from('story_views')
    .upsert({ story_id: storyId }, { onConflict: 'story_id,viewer_id' });
}

export async function fetchStoryViewers(storyId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('story_views')
    .select('viewer_id')
    .eq('story_id', storyId);
  if (error) return [];
  const viewerIds = (data || []).map((v) => v.viewer_id);
  if (viewerIds.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', viewerIds);
  return (profiles || []) as Profile[];
}

export async function deleteStory(storyId: string): Promise<void> {
  await supabase.from('stories').delete().eq('id', storyId);
}
