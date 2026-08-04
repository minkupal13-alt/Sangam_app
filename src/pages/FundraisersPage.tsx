import { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount } from '@/lib/format';
import DonateModal from '@/components/DonateModal';
import PageSkeleton from '@/components/PageSkeleton';

interface Fundraiser {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  raised_amount: number;
  image_url: string | null;
  creator_id: string;
  created_at: string;
  profiles?: { username: string; full_name: string; avatar_url: string | null } | null;
}

export default function FundraisersPage() {
  const profile = useAuthStore((s) => s.profile);
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [donateTarget, setDonateTarget] = useState<Fundraiser | null>(null);

  const fetchFundraisers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fundraisers')
      .select('*, profiles:creator_id(username, full_name, avatar_url)')
      .order('created_at', { ascending: false });
    if (!error && data) setFundraisers(data as Fundraiser[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFundraisers(); }, [fetchFundraisers]);

  const filtered = fundraisers.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white">Fundraisers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Support causes that matter</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-coral-500/20">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search fundraisers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-navy-300 border border-transparent focus:border-brand-500 outline-none text-sm text-gray-900 dark:text-white transition-colors"
        />
      </div>

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <Heart className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No fundraisers yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((f) => {
            const pct = f.goal_amount > 0 ? Math.min(100, (f.raised_amount / f.goal_amount) * 100) : 0;
            return (
              <div
                key={f.id}
                className="bg-white dark:bg-navy-200 rounded-2xl overflow-hidden border border-gray-100 dark:border-navy-300 shadow-sm hover:shadow-md transition-shadow"
              >
                {f.image_url && (
                  <img src={f.image_url} alt={f.title} className="w-full h-40 object-cover" loading="lazy" />
                )}
                <div className="p-4">
                  <h3 className="font-heading font-bold text-gray-900 dark:text-white text-base mb-1 line-clamp-1">{f.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{f.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                    <span className="font-semibold text-brand-500">₹{formatCount(f.raised_amount)} raised</span>
                    <span>Goal ₹{formatCount(f.goal_amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-navy-300 overflow-hidden mb-3">
                    <div className="h-full bg-sangam-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <button
                    onClick={() => setDonateTarget(f)}
                    className="w-full py-2 rounded-xl bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Donate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {donateTarget && profile && (
        <DonateModal
          open={true}
          onClose={() => setDonateTarget(null)}
          fundraiserId={donateTarget.id}
          title={donateTarget.title}
          goalAmount={donateTarget.goal_amount}
          raisedAmount={donateTarget.raised_amount}
        />
      )}
    </div>
  );
}
