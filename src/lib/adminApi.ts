import { supabase } from './supabase';

export interface AdminStats {
  totalUsers: number;
  activeNow: number;
  postsToday: number;
  pendingReports: number;
  revenueToday: number;
  storageUsed: number;
}

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  email?: string;
  status?: string;
  last_active?: string | null;
}

export interface AdminReport {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter?: { username: string; full_name: string; avatar_url: string | null };
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  channels: string[];
  scheduled_for: string | null;
  expires_at: string | null;
  is_emergency: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin?: { username: string; full_name: string };
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user?: { username: string; full_name: string; avatar_url: string | null };
}

export interface PlatformSettings {
  id: string;
  new_signups_enabled: boolean;
  google_oauth_enabled: boolean;
  marketplace_enabled: boolean;
  live_streaming_enabled: boolean;
  audio_rooms_enabled: boolean;
  monetization_enabled: boolean;
  tips_enabled: boolean;
  subscriptions_enabled: boolean;
  coins_enabled: boolean;
  jobs_enabled: boolean;
  fundraisers_enabled: boolean;
  podcasts_enabled: boolean;
  groups_enabled: boolean;
  pages_enabled: boolean;
  watch_party_enabled: boolean;
  duet_stitch_enabled: boolean;
  post_scheduling_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  blocked_words: string[];
  max_file_size_mb: number;
  max_video_duration_min: number;
  max_post_length: number;
  daily_post_limit: number;
  min_withdrawal_amount: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [usersRes, postsRes, reportsRes, tipsRes, coinsRes, payoutsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tips').select('amount').gte('created_at', todayStart),
    supabase.from('coin_purchases').select('amount').gte('created_at', todayStart),
    supabase.from('payouts').select('amount').eq('status', 'pending'),
  ]);

  const tipsTotal = (tipsRes.data || []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const coinsTotal = (coinsRes.data || []).reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);

  return {
    totalUsers: usersRes.count || 0,
    activeNow: 0,
    postsToday: postsRes.count || 0,
    pendingReports: reportsRes.count || 0,
    revenueToday: tipsTotal + coinsTotal,
    storageUsed: 0,
  };
}

export async function fetchAdminUsers(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
}): Promise<{ users: AdminUser[]; total: number }> {
  const { page = 0, pageSize = 20, search, role } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('profiles').select('*', { count: 'exact' });
  if (search) {
    query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  if (role && role !== 'all') {
    query = query.eq('role', role);
  }
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { users: (data || []) as AdminUser[], total: count || 0 };
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
  await logAdminAction('update_role', 'user', userId, { role });
}

export async function toggleUserVerification(userId: string, verified: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_verified: verified }).eq('id', userId);
  if (error) throw error;
  await logAdminAction('toggle_verification', 'user', userId, { verified });
}

export async function fetchReports(status: string): Promise<AdminReport[]> {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query.limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const reporterIds = [...new Set(data.map((r: { reporter_id: string }) => r.reporter_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', reporterIds);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));

  return data.map((r: Record<string, unknown>) => ({
    ...(r as unknown as AdminReport),
    reporter: profileMap.get(r.reporter_id as string) as AdminReport['reporter'],
  }));
}

export async function updateReportStatus(reportId: string, status: string): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  if (error) throw error;
  await logAdminAction('update_report', 'report', reportId, { status });
}

export async function fetchAnnouncements(): Promise<AdminAnnouncement[]> {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AdminAnnouncement[];
}

export async function createAnnouncement(a: {
  title: string;
  message: string;
  type: string;
  target: string;
  channels: string[];
  scheduled_for?: string | null;
  expires_at?: string | null;
  is_emergency?: boolean;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { error } = await supabase.from('announcements').insert({
    ...a,
    created_by: userData.user.id,
  });
  if (error) throw error;
  await logAdminAction('create_announcement', 'announcement', null, { title: a.title });
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const adminIds = [...new Set(data.map((l: { admin_id: string }) => l.admin_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', adminIds);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
  return data.map((l: Record<string, unknown>) => ({
    ...(l as unknown as AuditLogEntry),
    admin: profileMap.get(l.admin_id as string) as AuditLogEntry['admin'],
  }));
}

export async function logAdminAction(action: string, targetType: string, targetId: string | null, details: Record<string, unknown>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase.from('audit_logs').insert({
    admin_id: userData.user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}

export async function fetchSupportTickets(status?: string): Promise<SupportTicket[]> {
  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query.limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const userIds = [...new Set(data.map((t: { user_id: string }) => t.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
  return data.map((t: Record<string, unknown>) => ({
    ...(t as unknown as SupportTicket),
    user: profileMap.get(t.user_id as string) as SupportTicket['user'],
  }));
}

export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data as PlatformSettings | null;
}

export async function updatePlatformSettings(updates: Partial<PlatformSettings>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('platform_settings')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: userData.user?.id })
    .eq('id', (await fetchPlatformSettings())?.id || '');
  if (error) throw error;
  await logAdminAction('update_settings', 'platform', null, updates);
}

export interface AdminPayout {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  user?: { username: string; full_name: string };
}

export interface AdminVerificationRequest {
  id: string;
  user_id: string;
  category: string;
  reason: string;
  status: string;
  created_at: string;
  user?: { username: string; full_name: string; avatar_url: string | null };
}

export async function fetchRevenueData(days: number): Promise<{ date: string; revenue: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [tipsRes, coinsRes] = await Promise.all([
    supabase.from('tips').select('amount, created_at').gte('created_at', since),
    supabase.from('coin_purchases').select('amount, created_at').gte('created_at', since),
  ]);
  const byDate = new Map<string, number>();
  [...(tipsRes.data || []), ...(coinsRes.data || [])].forEach((t: { amount: number; created_at: string }) => {
    const date = new Date(t.created_at).toISOString().split('T')[0];
    byDate.set(date, (byDate.get(date) || 0) + Number(t.amount));
  });
  return Array.from(byDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchPendingPayouts(): Promise<{ id: string; user_id: string; amount: number; status: string; created_at: string; user?: { username: string; full_name: string } }[]> {
  const { data, error } = await supabase.from('payouts').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const userIds = [...new Set(data.map((p: { user_id: string }) => p.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
  return data.map((p: Record<string, unknown>) => ({
    ...(p as { id: string; user_id: string; amount: number; status: string; created_at: string }),
    user: profileMap.get(p.user_id as string) as { username: string; full_name: string } | undefined,
  }));
}

export async function approvePayout(payoutId: string, transactionRef: string): Promise<void> {
  const { error } = await supabase.from('payouts').update({ status: 'completed', transaction_ref: transactionRef }).eq('id', payoutId);
  if (error) throw error;
  await logAdminAction('approve_payout', 'payout', payoutId, { transactionRef });
}

export async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('payouts').update({ status: 'rejected', rejection_reason: reason }).eq('id', payoutId);
  if (error) throw error;
  await logAdminAction('reject_payout', 'payout', payoutId, { reason });
}

export async function fetchVerificationRequests(): Promise<{ id: string; user_id: string; category: string; reason: string; status: string; created_at: string; user?: { username: string; full_name: string; avatar_url: string | null } }[]> {
  const { data, error } = await supabase.from('verification_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const userIds = [...new Set(data.map((v: { user_id: string }) => v.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
  return data.map((v: Record<string, unknown>) => ({
    ...(v as { id: string; user_id: string; category: string; reason: string; status: string; created_at: string }),
    user: profileMap.get(v.user_id as string) as { username: string; full_name: string; avatar_url: string | null } | undefined,
  }));
}

export async function approveVerification(requestId: string, userId: string): Promise<void> {
  await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', requestId);
  await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
  await logAdminAction('approve_verification', 'user', userId, { requestId });
}

export async function rejectVerification(requestId: string, reason: string): Promise<void> {
  await supabase.from('verification_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', requestId);
  await logAdminAction('reject_verification', 'verification', requestId, { reason });
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      }).join(','),
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
