import { useState, useEffect } from 'react';
import { DollarSign, Loader2, Download, Check, X } from 'lucide-react';
import { fetchRevenueData, fetchPendingPayouts, approvePayout, rejectPayout, exportToCsv, type AdminPayout } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';

export default function AdminFinancePage() {
  usePageTitle('Finance | Admin');
  const [revenue, setRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [approveModal, setApproveModal] = useState<{ id: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [txnRef, setTxnRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, [range]);

  async function loadData() {
    setLoading(true);
    try {
      const [rev, pay] = await Promise.all([fetchRevenueData(range), fetchPendingPayouts()]);
      setRevenue(rev);
      setPayouts(pay);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleApprove() {
    if (!approveModal || !txnRef.trim()) return;
    try {
      await approvePayout(approveModal.id, txnRef);
      setPayouts((prev) => prev.filter((p) => p.id !== approveModal.id));
      setApproveModal(null);
      setTxnRef('');
    } catch (err) { console.error(err); }
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await rejectPayout(rejectModal.id, rejectReason);
      setPayouts((prev) => prev.filter((p) => p.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) { console.error(err); }
  }

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const maxRev = Math.max(...revenue.map((r) => r.revenue), 1);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Finance</h1>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <p className="text-xs text-gray-400">Total Revenue</p>
          <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-1">₹{formatCount(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <p className="text-xs text-gray-400">Pending Payouts</p>
          <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-1">{payouts.length}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <p className="text-xs text-gray-400">Payout Amount</p>
          <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-1">₹{formatCount(payouts.reduce((s, p) => s + p.amount, 0))}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <p className="text-xs text-gray-400">Transactions</p>
          <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-1">{revenue.length}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Revenue</h2>
          <div className="flex gap-1">
            {[30, 90, 365].map((d) => (
              <button key={d} onClick={() => setRange(d)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${range === d ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-500'}`}>
                {d === 30 ? '30D' : d === 90 ? '3M' : '1Y'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between gap-0.5 h-32">
          {revenue.slice(-30).map((r, i) => (
            <div key={i} className="flex-1 flex items-end">
              <div className="w-full rounded-t bg-sangam-gradient" style={{ height: `${(r.revenue / maxRev) * 100}%`, minHeight: r.revenue > 0 ? '3px' : '0' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Pending withdrawals */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Pending Withdrawals</h2>
          <button onClick={() => exportToCsv('payouts.csv', payouts.map((p) => ({ user: p.user?.username, amount: p.amount, date: p.created_at })))} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-brand-500">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        {payouts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No pending withdrawals.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.user?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">@{p.user?.username} · {timeAgo(p.created_at)}</p>
                </div>
                <p className="font-heading font-bold text-sm text-gray-900 dark:text-white">₹{formatCount(p.amount)}</p>
                <button onClick={() => setApproveModal({ id: p.id })} className="h-7 w-7 rounded-lg flex items-center justify-center text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setRejectModal({ id: p.id })} className="h-7 w-7 rounded-lg flex items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setApproveModal(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-3">Approve Payout</h2>
            <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="Transaction reference..." className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setApproveModal(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-navy-300 text-sm font-bold text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={handleApprove} className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-bold active:scale-95 transition-transform">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRejectModal(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-3">Reject Payout</h2>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason..." className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-navy-300 text-sm font-bold text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold active:scale-95 transition-transform">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
