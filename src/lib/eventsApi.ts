import { supabase } from '@/lib/supabase';
import type { EventItem, Profile } from '@/lib/types';

export async function fetchEvents(limit = 20): Promise<EventItem[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true }).limit(limit);
  if (error || !data) return [];
  const userIds = [...new Set(data.map((e) => e.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((e) => ({ ...e, author: profileMap.get(e.user_id) }));
}

export async function fetchEventById(id: string, currentUserId?: string): Promise<EventItem | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user_id).maybeSingle();
  let myStatus: EventItem['my_status'] = null;
  if (currentUserId) {
    const { data: attendee } = await supabase.from('event_attendees').select('status').eq('event_id', id).eq('user_id', currentUserId).maybeSingle();
    myStatus = attendee?.status || null;
  }
  return { ...data, author: profile as Profile, my_status: myStatus };
}

export async function createEvent(event: { title: string; description?: string; cover_url?: string | null; event_date: string; event_time: string; location: string; is_online: boolean }): Promise<EventItem | null> {
  const { data, error } = await supabase.from('events').insert(event).select('*').single();
  if (error) throw error;
  return data;
}

export async function setAttendance(eventId: string, status: 'going' | 'interested' | 'not_going'): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  const { data: existing } = await supabase.from('event_attendees').select('status').eq('event_id', eventId).eq('user_id', user.user.id).maybeSingle();
  if (existing) {
    await supabase.from('event_attendees').update({ status }).eq('event_id', eventId).eq('user_id', user.user.id);
  } else {
    await supabase.from('event_attendees').insert({ event_id: eventId, status });
  }
}

export async function fetchEventAttendees(eventId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('event_attendees').select('user_id').eq('event_id', eventId).eq('status', 'going');
  if (error || !data) return [];
  const userIds = data.map((a) => a.user_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  return (profiles || []) as Profile[];
}

export function generateICS(event: EventItem): string {
  const dt = new Date(`${event.event_date}T${event.event_time}`);
  const dtEnd = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${event.id}@sangam\nDTSTAMP:${fmt(new Date())}\nDTSTART:${fmt(dt)}\nDTEND:${fmt(dtEnd)}\nSUMMARY:${event.title}\nDESCRIPTION:${event.description || ''}\nLOCATION:${event.location}\nEND:VEVENT\nEND:VCALENDAR`;
}
