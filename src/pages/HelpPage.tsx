import { useState, useEffect } from 'react';
import { LifeBuoy, ChevronDown, Send, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

const FAQS = [
  { q: 'How do I create a post?', a: 'Tap the Create button at the bottom of the screen or in the sidebar. You can add text, photos, videos, polls, and more.' },
  { q: 'How do I monetize my content?', a: 'Go to Settings and enable Creator Monetization. You can then accept tips, set up subscriptions, and sell on the marketplace.' },
  { q: 'How do I get verified?', a: 'Go to Settings > Apply for Verification. Submit your name, category, reason, social links, and ID proof. Our team reviews requests within 3-5 days.' },
  { q: 'How do Sangam Coins work?', a: 'Coins are purchased with real money via Razorpay and can be used to tip creators, boost posts, and donate to fundraisers.' },
  { q: 'How do I withdraw my earnings?', a: 'Go to Earnings page, enter your UPI or bank details, and request a payout. Minimum withdrawal is ₹100. Payouts are processed within 5-7 business days.' },
  { q: 'How do I report inappropriate content?', a: 'Tap the three dots on any post, flick, or video and select Report. Our moderation team reviews all reports within 24 hours.' },
  { q: 'Can I change my username?', a: 'Yes, you can change your username once every 30 days from Settings > Account.' },
  { q: 'How do I delete my account?', a: 'Go to Settings > Account > Delete Account. Your account enters a 30-day grace period before permanent deletion.' },
];

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function HelpPage() {
  usePageTitle('Help & Support | Sangam');
  const profile = useAuthStore((s) => s.profile);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => { loadTickets(); }, [profile]);

  async function loadTickets() {
    if (!profile) { setLoadingTickets(false); return; }
    const { data } = await supabase.from('support_tickets').select('id, subject, status, created_at').eq('user_id', profile.id).order('created_at', { ascending: false });
    setTickets((data || []) as Ticket[]);
    setLoadingTickets(false);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('support_tickets').insert({
        user_id: userData.user?.id,
        subject: subject.trim(),
        category: 'general',
      });
      // Add initial message
      const { data: ticketData } = await supabase.from('support_tickets').select('id').eq('user_id', userData.user?.id).order('created_at', { ascending: false }).limit(1).single();
      if (ticketData) {
        await supabase.from('ticket_messages').insert({
          ticket_id: (ticketData as { id: string }).id,
          sender_id: userData.user?.id,
          message: message.trim(),
          is_admin_reply: false,
        });
      }
      setSubject('');
      setMessage('');
      setShowForm(false);
      loadTickets();
    } catch (err) { console.error(err); }
    setSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <LifeBuoy className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Help & Support</h1>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden mb-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white p-4 border-b border-gray-100 dark:border-navy-300">Frequently Asked Questions</h2>
        <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full p-4 text-left">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-4 pb-4 text-sm text-gray-500 dark:text-gray-400">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Contact Support</h2>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform">
            <MessageSquare className="h-3.5 w-3.5" /> New Ticket
          </button>
        </div>

        {showForm && (
          <form onSubmit={submitTicket} className="space-y-3 mb-3">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe your issue..." required className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 resize-none" />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-sangam-gradient text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Ticket
            </button>
          </form>
        )}

        {/* My tickets */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">My Tickets</h3>
          {loadingTickets ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-navy-300">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.status === 'open' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>{t.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
