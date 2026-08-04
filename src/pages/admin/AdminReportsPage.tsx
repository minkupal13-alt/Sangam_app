import { useState, useEffect } from 'react';
import { Flag, Loader2, Check, X, AlertTriangle, Ban, Eye } from 'lucide-react';
import { fetchReports, updateReportStatus, type AdminReport } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

const TABS = ['pending', 'under_review', 'resolved', 'all'] as const;

export default function AdminReportsPage() {
  usePageTitle('Reports | Admin');
  const [tab, setTab] = useState<typeof TABS[number]>('pending');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, [tab]);

  async function loadReports() {
    setLoading(true);
    try {
      const r = await fetchReports(tab);
      setReports(r);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleAction(reportId: string, action: string) {
    try {
      if (action === 'dismiss') await updateReportStatus(reportId, 'resolved');
      else if (action === 'review') await updateReportStatus(reportId, 'under_review');
      loadReports();
    } catch (err) { console.error(err); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <Flag className="h-5 w-5 text-red-500" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Content Moderation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors capitalize ${
              tab === t ? 'bg-sangam-gradient text-white' : 'bg-white dark:bg-navy-200 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-navy-300'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Flag className="h-12 w-12 text-gray-200 dark:text-navy-50 mb-3" />
          <p className="text-gray-400 text-sm">No reports in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
              <div className="flex items-start gap-3">
                <img src={r.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${r.reporter?.full_name || '?'}`} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.reporter?.full_name} <span className="text-gray-400 font-normal">@{r.reporter?.username}</span></p>
                  <p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : r.status === 'resolved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {r.status}
                </span>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-navy-300">
                <p className="text-xs text-gray-400 mb-1">Reported {r.target_type} ({r.target_id.slice(0, 8)}...)</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{r.reason}</p>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => handleAction(r.id, 'dismiss')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30">
                  <Check className="h-3.5 w-3.5" /> Dismiss
                </button>
                <button onClick={() => handleAction(r.id, 'review')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                  <Eye className="h-3.5 w-3.5" /> Under Review
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30">
                  <AlertTriangle className="h-3.5 w-3.5" /> Warn User
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30">
                  <X className="h-3.5 w-3.5" /> Remove Content
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40">
                  <Ban className="h-3.5 w-3.5" /> Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
