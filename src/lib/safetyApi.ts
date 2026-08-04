import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function reportTarget(params: { target_type: 'post' | 'comment' | 'user' | 'flick' | 'video'; target_id: string; reason: string; description?: string }): Promise<void> {
  await supabase.from('reports').insert(params);
}

export async function blockUser(blockedId: string): Promise<void> {
  await supabase.from('blocks').insert({ blocked_id: blockedId });
  await supabase.from('follows').delete().eq('following_id', blockedId);
  await supabase.from('follows').delete().eq('follower_id', blockedId);
}

export async function unblockUser(blockedId: string): Promise<void> {
  await supabase.from('blocks').delete().eq('blocked_id', blockedId);
}

export async function fetchBlockedUsers(currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentUserId);
  if (error || !data) return [];
  const userIds = data.map((b) => b.blocked_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  return (profiles || []) as Profile[];
}

export async function muteUser(mutedId: string): Promise<void> {
  await supabase.from('mutes').insert({ muted_id: mutedId });
}

export async function unmuteUser(mutedId: string): Promise<void> {
  await supabase.from('mutes').delete().eq('muted_id', mutedId);
}

export async function fetchMutedUsers(currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('mutes').select('muted_id').eq('muter_id', currentUserId);
  if (error || !data) return [];
  const userIds = data.map((m) => m.muted_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  return (profiles || []) as Profile[];
}
