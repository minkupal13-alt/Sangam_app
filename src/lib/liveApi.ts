import { supabase } from '@/lib/supabase';
import type { LiveStream, LiveComment, Profile } from '@/lib/types';

export async function startLiveStream(title: string, thumbnailUrl: string | null): Promise<LiveStream | null> {
  const { data, error } = await supabase.from('live_streams').insert({ title, thumbnail_url: thumbnailUrl, status: 'live' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function endLiveStream(streamId: string, replayUrl?: string): Promise<void> {
  await supabase.from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString(), replay_url: replayUrl || null }).eq('id', streamId);
}

export async function fetchLiveStreams(limit = 10): Promise<LiveStream[]> {
  const { data, error } = await supabase.from('live_streams').select('*').eq('status', 'live').order('started_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  const userIds = [...new Set(data.map((s) => s.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((s) => ({ ...s, author: profileMap.get(s.user_id) }));
}

export async function fetchLiveStreamById(id: string): Promise<LiveStream | null> {
  const { data, error } = await supabase.from('live_streams').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user_id).maybeSingle();
  return { ...data, author: profile as Profile };
}

export async function fetchLiveComments(streamId: string, limit = 50): Promise<LiveComment[]> {
  const { data, error } = await supabase.from('live_comments').select('*').eq('stream_id', streamId).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  const userIds = [...new Set(data.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((c) => ({ ...c, author: profileMap.get(c.user_id) }));
}

export async function sendLiveComment(streamId: string, content: string): Promise<void> {
  await supabase.from('live_comments').insert({ stream_id: streamId, content });
}

export function subscribeToLiveComments(streamId: string, callback: (comment: LiveComment) => void) {
  return supabase.channel(`live_comments:${streamId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_comments', filter: `stream_id=eq.${streamId}` }, async (payload) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).maybeSingle();
    callback({ ...payload.new as LiveComment, author: profile as Profile });
  }).subscribe();
}

export function subscribeToViewerCount(streamId: string, callback: (count: number) => void) {
  return supabase.channel(`live_viewers:${streamId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` }, (payload) => {
    callback((payload.new as LiveStream).viewer_count);
  }).subscribe();
}
