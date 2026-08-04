import { supabase } from '@/lib/supabase';
import type { MarketplaceListing, Profile } from '@/lib/types';

export async function fetchListings(params?: { category?: string; minPrice?: number; maxPrice?: number; search?: string; limit?: number }): Promise<MarketplaceListing[]> {
  let query = supabase.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (params?.category && params.category !== 'All') query = query.eq('category', params.category);
  if (params?.minPrice !== undefined) query = query.gte('price', params.minPrice);
  if (params?.maxPrice !== undefined) query = query.lte('price', params.maxPrice);
  if (params?.search) query = query.ilike('title', `%${params.search}%`);
  query = query.limit(params?.limit || 24);
  const { data, error } = await query;
  if (error || !data) return [];
  const userIds = [...new Set(data.map((l) => l.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((l) => ({ ...l, author: profileMap.get(l.user_id) }));
}

export async function fetchListingById(id: string, currentUserId?: string): Promise<MarketplaceListing | null> {
  const { data, error } = await supabase.from('marketplace_listings').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user_id).maybeSingle();
  let savedByMe = false;
  if (currentUserId) {
    const { data: saved } = await supabase.from('saved_listings').select('id').eq('listing_id', id).eq('user_id', currentUserId).maybeSingle();
    savedByMe = !!saved;
  }
  return { ...data, author: profile as Profile, saved_by_me: savedByMe };
}

export async function createListing(listing: { title: string; description?: string; price: number; category: string; condition: 'new' | 'used'; location?: string; image_urls: string[] }): Promise<MarketplaceListing | null> {
  const { data, error } = await supabase.from('marketplace_listings').insert(listing).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveListing(listingId: string): Promise<void> {
  await supabase.from('saved_listings').insert({ listing_id: listingId });
}

export async function unsaveListing(listingId: string): Promise<void> {
  await supabase.from('saved_listings').delete().eq('listing_id', listingId);
}
