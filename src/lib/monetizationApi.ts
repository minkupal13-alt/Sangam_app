import { supabase } from '@/lib/supabase';
import type { CreatorMonetization, Tip, Profile } from '@/lib/types';
export async function fetchMonetization(userId: string): Promise<CreatorMonetization | null> {
  const { data, error } = await supabase.from('creator_monetization').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function upsertMonetization(settings: { is_enabled: boolean; upi_id?: string | null; subscription_enabled: boolean; subscription_price?: number | null }): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { data: existing } = await supabase.from('creator_monetization').select('id').eq('user_id', userData.user?.id).maybeSingle();
  if (existing) {
    await supabase.from('creator_monetization').update(settings).eq('id', existing.id);
  } else {
    await supabase.from('creator_monetization').insert(settings);
  }
}

export async function sendTip(creatorId: string, amount: number, message?: string): Promise<void> {
  await supabase.from('tips').insert({ creator_id: creatorId, amount, message: message || null });
}

export async function fetchTotalTips(creatorId: string): Promise<number> {
  const { data, error } = await supabase.from('tips').select('amount').eq('creator_id', creatorId);
  if (error || !data) return 0;
  return data.reduce((sum, t) => sum + Number(t.amount), 0);
}
