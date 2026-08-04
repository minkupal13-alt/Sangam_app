import { useState, useEffect } from 'react';
import { ScrollText, Loader2, Filter } from 'lucide-react';
import { fetchAuditLogs, type AuditLogEntry } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

export default function AdminAuditLogPage() {
  usePageTitle('Audit Log | Admin');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const l = await fetchAuditLogs();
      setLogs(l);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const filtered = actionFilter === 'all' ? logs : logs.filter((l) => l.action.includes(actionFilter));
  const actions = [...new Set(logs.map((l) => l.action.split('_')[0]))];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <ScrollText className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Audit Log</h1>
        <span className="text-xs text-gray-400 ml-2">Append-only · Cannot be deleted</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none">
          <option value="all">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ScrollText className="h-12 w-12 text-gray-200 dark:text-navy-50 mb-3" />
          <p className="text-gray-400 text-sm">No audit log entries.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-navy-300">
                <th className="text-left font-semibold px-4 py-3">Admin</th>
                <th className="text-left font-semibold px-2 py-3">Action</th>
                <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">Target</th>
                <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Details</th>
                <th className="text-right font-semibold px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-navy-300/50">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-navy-300/50">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{l.admin?.full_name || l.admin?.username || 'System'}</td>
                  <td className="px-2 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{l.action}</td>
                  <td className="px-2 py-3 hidden sm:table-cell text-gray-500 dark:text-gray-400 text-xs">{l.target_type || '-'}</td>
                  <td className="px-2 py-3 hidden md:table-cell text-gray-400 text-xs max-w-xs truncate">{l.details ? JSON.stringify(l.details) : '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
