import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LogoutConfirmModal({ open, onClose }: LogoutConfirmModalProps) {
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
      onClose();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-navy-200 shadow-2xl border border-gray-100 dark:border-navy-300 p-6 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
            <LogOut className="h-6 w-6 text-red-500" />
          </div>
          <h2 id="logout-title" className="font-heading font-bold text-lg text-gray-900 dark:text-white">
            लॉग आउट करें?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            क्या आप वाकई लॉग आउट करना चाहते हैं?
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-navy-400 transition-colors disabled:opacity-50"
          >
            रद्द करें
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            लॉग आउट
          </button>
        </div>
      </div>
    </div>
  );
}
