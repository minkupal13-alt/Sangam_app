/**
 * Minimal QR code generator — produces a QR code on a canvas.
 * Uses the qrcode library if available, otherwise falls back to a simple canvas.
 * This is a lightweight implementation using the qrcode npm package.
 */

import type { Profile } from './types';

export async function createQRCanvas(canvas: HTMLCanvasElement, text: string, size: number): Promise<void> {
  try {
    const QRCode = (await import('qrcode')).default;
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      color: { dark: '#0b1220', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch {
    // Fallback: draw a placeholder
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0b1220';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR', size / 2, size / 2);
  }
}

export function getLevelInfo(points: number): { level: string; color: string; bgColor: string } {
  if (points >= 10000) return { level: 'platinum', color: 'text-gray-300', bgColor: 'from-gray-400 to-gray-600' };
  if (points >= 5000) return { level: 'gold', color: 'text-amber-500', bgColor: 'from-amber-400 to-amber-600' };
  if (points >= 1000) return { level: 'silver', color: 'text-gray-400', bgColor: 'from-gray-300 to-gray-500' };
  return { level: 'bronze', color: 'text-orange-600', bgColor: 'from-orange-400 to-orange-700' };
}

export async function fetchBioLinks(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('bio_links')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchHighlights(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('story_highlights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchUserPoints(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('user_points')
    .select('points, level')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || { points: 0, level: 1 };
}

export async function fetchCreatorMonetization(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('creator_monetization')
    .select('is_enabled, subscription_enabled, subscription_price')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function fetchBookmarkCollections(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('bookmark_collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchMarketplaceListings(userId: string) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchFlicksByUser(userId: string, limit = 20) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('flicks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchVideosByUser(userId: string, limit = 20) {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export type { Profile };
