import { useState, useEffect } from 'react';
import { LifeBuoy, Loader2, Send, X } from 'lucide-react';
import { fetchSupportTickets, type SupportTicket } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

export default function AdminSupportPage() {
  usePageTitle('Support | Admin');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; message: string; is_admin_reply: boolean; created_at: string }[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      const t = await fetchSupportTickets(statusFilter);
      setTickets(t);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  useEffect(() => { loadTickets(); }, [statusFilter]);

  async function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setMessages((data || []) as { id: string; sender_id: string; message: string; is_admin_reply: boolean; created_at: string }[]);
  }

  async function sendReply() {
    if (!selectedTicket || !reply.trim()) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: msgData } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: userData.user?.id,
        message: reply.trim(),
        is_admin_reply: true,
      }).select('*').single();
      if (msgData) {
        setMessages((prev) => [...prev, msgData as { id: string; sender_id: string; message: string; is_admin_reply: boolean; created_at: string }]);
      }
      await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
      setReply('');
    } catch (err) { console.error(err); }
    setSending(false);
  }

  async function updateStatus(status: string) {
    if (!selectedTicket) return;
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
    setSelectedTicket({ ...selectedTicket, status });
    loadTickets();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <LifeBuoy className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Support Tickets</h1>
      </div>

      <div className="flex gap-1 mb-4">
        {['all', 'open', 'in_progress', 'resolved'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-full text-sm font-semibold capitalize ${statusFilter === s ? 'bg-sangam-gradient text-white' : 'bg-white dark:bg-navy-200 text-gray-500 border border-gray-200 dark:border-navy-300'}`}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LifeBuoy className="h-12 w-12 text-gray-200 dark:text-navy-50 mb-3" />
          <p className="text-gray-400 text-sm">No support tickets.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} onClick={() => openTicket(t)} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <img src={t.user?.avatar_url || `https://ui-avatars.com/api/?name=${t.user?.full_name || '?'}`} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400">@{t.user?.username} · {timeAgo(t.created_at)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.status === 'open' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>{t.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
          <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-navy-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
              <button onClick={() => setSelectedTicket(null)} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center"><X className="h-4 w-4 text-gray-500" /></button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white truncate">{selectedTicket.subject}</h2>
              <div className="w-8" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.is_admin_reply ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white'}`}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-gray-100 dark:border-navy-300 flex gap-2">
              <select onChange={(e) => updateStatus(e.target.value)} value={selectedTicket.status} className="px-2 py-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-xs text-gray-700 dark:text-gray-300 outline-none">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }} placeholder="Reply..." className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500" />
              <button onClick={sendReply} disabled={sending} className="h-9 w-9 rounded-xl bg-sangam-gradient flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50">
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
