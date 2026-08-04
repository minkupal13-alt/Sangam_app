import { supabase } from '@/lib/supabase';
import type { AudioRoom, RoomParticipant, Profile } from '@/lib/types';

export async function fetchActiveRooms(limit = 20): Promise<AudioRoom[]> {
  const { data, error } = await supabase.from('audio_rooms').select('*').in('status', ['live', 'scheduled']).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  const userIds = [...new Set(data.map((r) => r.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((r) => ({ ...r, author: profileMap.get(r.user_id) }));
}

export async function fetchRoomById(id: string): Promise<AudioRoom | null> {
  const { data, error } = await supabase.from('audio_rooms').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user_id).maybeSingle();
  return { ...data, author: profile as Profile };
}

export async function createRoom(title: string, topic: string, scheduledAt: string | null): Promise<AudioRoom | null> {
  const { data, error } = await supabase.from('audio_rooms').insert({ title, topic, scheduled_at: scheduledAt, status: scheduledAt ? 'scheduled' : 'live' }).select('*').single();
  if (error) throw error;
  await supabase.from('room_participants').insert({ room_id: data.id, role: 'host', is_muted: false });
  return data;
}

export async function fetchRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  const { data, error } = await supabase.from('room_participants').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
  if (error || !data) return [];
  const userIds = [...new Set(data.map((p) => p.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((p) => ({ ...p, profile: profileMap.get(p.user_id) }));
}

export async function joinRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from('room_participants').insert({ room_id: roomId, role: 'listener', is_muted: true });
  if (error && error.code !== '23505') throw error;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from('room_participants').delete().eq('room_id', roomId).eq('user_id', user.user.id);
}

export async function toggleMute(roomId: string, isMuted: boolean): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from('room_participants').update({ is_muted: !isMuted }).eq('room_id', roomId).eq('user_id', user.user.id);
}

export async function raiseHand(roomId: string, raised: boolean): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from('room_participants').update({ hand_raised: raised }).eq('room_id', roomId).eq('user_id', user.user.id);
}

export async function endRoom(roomId: string): Promise<void> {
  await supabase.from('audio_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomId);
  await supabase.from('room_participants').delete().eq('room_id', roomId);
}

export async function updateParticipantRole(roomId: string, userId: string, role: 'speaker' | 'listener'): Promise<void> {
  await supabase.from('room_participants').update({ role }).eq('room_id', roomId).eq('user_id', userId);
}

export async function muteParticipant(roomId: string, userId: string): Promise<void> {
  await supabase.from('room_participants').update({ is_muted: true }).eq('room_id', roomId).eq('user_id', userId);
}

export function subscribeToRoomParticipants(roomId: string, callback: (participants: RoomParticipant[]) => void) {
  return supabase.channel(`room_participants:${roomId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, () => {
    fetchRoomParticipants(roomId).then(callback);
  }).subscribe();
}
