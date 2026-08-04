import { useState } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import { reportTarget } from '@/lib/safetyApi';

interface ReportModalProps {
  targetType: 'post' | 'comment' | 'user' | 'flick' | 'video';
  targetId: string;
  open: boolean;
  onClose: () => void;
}

const REASONS = ['Spam', 'Hate', 'Misleading', 'Nudity', 'Violence', 'Other'];

export default function ReportModal({ targetType, targetId, open, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportTarget({ target_type: targetType, target_id: targetId, reason, description: description.trim() || undefined });
      setDone(true);
      setTimeout(() => {
        onClose();
        setDone(false);
        setReason('');
        setDescription('');
      }, 1500);
    } catch {
      // ignore
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-navy-100 rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="flex flex-col items-center py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
              <Flag className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">Report submitted</p>
            <p className="text-sm text-gray-400 mt-1">Thank you for keeping Sangam safe</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-red-500 flex items-center justify-center">
                  <Flag className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white">Report</h2>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Why are you reporting this?</p>
            <div className="space-y-2 mb-4">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${reason === r ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-2 border-red-400' : 'bg-gray-50 dark:bg-navy-200 text-gray-600 dark:text-gray-300 border-2 border-transparent'}`}>
                  {r}
                </button>
              ))}
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details (optional)" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
            <button onClick={handleSubmit} disabled={submitting || !reason} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
