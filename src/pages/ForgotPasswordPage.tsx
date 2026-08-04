import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SangamLogo from '@/components/SangamLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#fafaf9] dark:bg-[#0b1220]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <SangamLogo size={72} />
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 dark:text-white mt-4">Sangam</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Everything. One Sangam.</p>
        </div>

        <div className="bg-white dark:bg-navy-200 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 p-6 border border-gray-100 dark:border-navy-300">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 mx-auto text-brand-500 mb-3" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-1">Check your email</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                We sent a password reset link to {email}
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-1">Reset password</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
                Enter your email and we'll send you a reset link
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                {error && <p className="text-coral-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 mt-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
