import { supabase } from './supabase';
import type { Notification, NotificationSettings, Profile, Post } from './types';

/**
 * Fetch notifications for the current user, with actor profiles and
 * optional post thumbnails.
 */
export async function fetchNotifications(
  filter?: 'all' | 'mentions',
): Promise<Notification[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', me.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (filter === 'mentions') {
    query = query.eq('type', 'mention');
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch actor profiles
  const actorIds = [...new Set(data.map((n) => n.from_user_id))];
  const { data: actors } = await supabase
    .from('profiles')
    .select('*')
    .in('id', actorIds);
  const actorMap = new Map<string, Profile>();
  (actors || []).forEach((a) => actorMap.set(a.id, a as Profile));

  // Fetch post thumbnails for post-related notifications
  const postIds = [
    ...new Set(
      data
        .filter((n) => n.target_type === 'post' && n.target_id)
        .map((n) => n.target_id as string),
    ),
  ];
  const postMap = new Map<string, Post>();
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);
    (posts || []).forEach((p) => postMap.set(p.id, p as Post));
  }

  return data.map((n) => ({
    ...n,
    actor: actorMap.get(n.from_user_id),
  })) as Notification[];
}

/**
 * Fetch the post thumbnail URL for a notification's target post.
 */
export async function fetchNotificationPostThumbnail(
  postId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('posts')
    .select('media_urls, media_type')
    .eq('id', postId)
    .maybeSingle();
  if (!data) return null;
  if (data.media_urls && data.media_urls.length > 0) return data.media_urls[0];
  return null;
}

/**
 * Mark all visible notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', me.user.id)
    .eq('is_read', false);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

/**
 * Get unread notification count.
 */
export async function fetchUnreadCount(): Promise<number> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', me.user.id)
    .eq('is_read', false);
  return count || 0;
}

/**
 * Subscribe to new notifications via Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: Notification) => void,
): () => void {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const n = payload.new as Notification;
        // Fetch actor profile
        const { data: actor } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', n.from_user_id)
          .maybeSingle();
        onNew({ ...n, actor: actor as Profile });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get notification settings for the current user.
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return defaultSettings();

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', me.user.id)
    .maybeSingle();

  if (!data) return defaultSettings();
  return {
    likes_enabled: data.likes_enabled,
    comments_enabled: data.comments_enabled,
    follows_enabled: data.follows_enabled,
    mentions_enabled: data.mentions_enabled,
    messages_enabled: data.messages_enabled,
    echoes_enabled: data.echoes_enabled,
  };
}

/**
 * Update notification settings (upsert).
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;

  // Try update first, then insert
  const { data: existing } = await supabase
    .from('notification_settings')
    .select('id')
    .eq('user_id', me.user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('notification_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('user_id', me.user.id);
  } else {
    await supabase.from('notification_settings').insert({
      user_id: me.user.id,
      ...settings,
    });
  }
}

function defaultSettings(): NotificationSettings {
  return {
    likes_enabled: true,
    comments_enabled: true,
    follows_enabled: true,
    mentions_enabled: true,
    messages_enabled: true,
    echoes_enabled: true,
  };
}

/**
 * Relative timestamp in Hindi-English mix ("abhi", "2 ghante pehle", etc.)
 */
export function timeAgoHindi(ts: string): string {
  const date = new Date(ts);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'abhi';
  if (sec < 60) return `${sec} sec pehle`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min pehle`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ghante pehle`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} din pehle`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk} hafte pehle`;
  const mo = Math.floor(day / 30);
  return `${mo} mahine pehle`;
}
