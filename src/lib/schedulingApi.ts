import { supabase } from '@/lib/supabase';
import type { ScheduledPost } from '@/lib/types';

export async function fetchScheduledPosts(): Promise<ScheduledPost[]> {
  const { data, error } = await supabase.from('scheduled_posts').select('*').eq('status', 'pending').order('scheduled_for', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function createScheduledPost(postData: ScheduledPost['post_data'], scheduledFor: string): Promise<ScheduledPost | null> {
  const { data, error } = await supabase.from('scheduled_posts').insert({ post_data: postData, scheduled_for: scheduledFor }).select('*').single();
  if (error) throw error;
  return data;
}

export async function cancelScheduledPost(id: string): Promise<void> {
  await supabase.from('scheduled_posts').update({ status: 'cancelled' }).eq('id', id);
}
