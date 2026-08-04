import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, BadgeCheck, X, Check } from 'lucide-react';
import { fetchVerificationRequests, approveVerification, rejectVerification, type AdminVerificationRequest } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

export default function AdminVerificationPage() {
  usePageTitle('Verification | Admin');
  const [requests, setRequests] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const r = await fetchVerificationRequests();
      setRequests(r);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleApprove(requestId: string, userId: string) {
    try {
      await approveVerification(requestId, userId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) { console.error(err); }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await rejectVerification(rejectId, rejectReason);
      setRequests((prev) => prev.filter((r) => r.id !== rejectId));
      setRejectId(null);
      setRejectReason('');
    } catch (err) { console.error(err); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Creator Verification</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BadgeCheck className="h-12 w-12 text-gray-200 dark:text-navy-50 mb-3" />
          <p className="text-gray-400 text-sm">No pending verification requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
              <div className="flex items-start gap-3">
                <img src={r.user?.avatar_url || `https://ui-avatars.com/api/?name=${r.user?.full_name || '?'}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{r.user?.full_name}</p>
                  <p className="text-xs text-gray-400">@{r.user?.username} · {timeAgo(r.created_at)}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2"><span className="text-gray-400 w-20">Category:</span><span className="text-gray-900 dark:text-white">{r.category}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20">Reason:</span><span className="text-gray-900 dark:text-white">{r.reason}</span></div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleApprove(r.id, r.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button onClick={() => setRejectId(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-3">Reject Verification</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-navy-300 text-sm font-bold text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold active:scale-95 transition-transform">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
