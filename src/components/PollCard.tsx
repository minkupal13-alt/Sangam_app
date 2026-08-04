import { useState, useEffect } from 'react';
import { BarChart3, Clock, Check } from 'lucide-react';
import { votePoll } from '@/lib/pollsApi';
import { useAuthStore } from '@/lib/authStore';
import type { Poll } from '@/lib/types';

interface PollCardProps {
  poll: Poll;
  onVoted?: () => void;
}

export default function PollCard({ poll, onVoted }: PollCardProps) {
  const profile = useAuthStore((s) => s.profile);
  const [votedOption, setVotedOption] = useState<number | null>(poll.my_vote ?? null);
  const [voteCounts, setVoteCounts] = useState<number[]>(poll.vote_counts || []);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setVotedOption(poll.my_vote ?? null);
    setVoteCounts(poll.vote_counts || []);
  }, [poll]);

  const totalVotes = voteCounts.reduce((a, b) => a + b, 0) || poll.total_votes || 0;
  const hasVoted = votedOption !== null;
  const isExpired = new Date(poll.expires_at) < new Date();
  const timeLeft = getTimeLeft(poll.expires_at);

  async function handleVote(optionIndex: number) {
    if (hasVoted || isExpired || !profile) return;
    setVoting(true);
    try {
      await votePoll(poll.id, optionIndex);
      const newCounts = [...voteCounts];
      newCounts[optionIndex] = (newCounts[optionIndex] || 0) + 1;
      setVoteCounts(newCounts);
      setVotedOption(optionIndex);
      onVoted?.();
    } catch {
      // ignore
    }
    setVoting(false);
  }

  return (
    <div className="px-4 py-3">
      <div className="p-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-coral-500 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="font-bold text-sm text-gray-900 dark:text-white">{poll.question}</p>
        </div>
        <div className="space-y-2">
          {poll.options.map((option, i) => {
            const votes = voteCounts[i] || 0;
            const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            const isMyVote = votedOption === i;
            const isCorrect = poll.is_quiz && poll.correct_option === i;
            return (
              <button key={i} onClick={() => handleVote(i)} disabled={hasVoted || isExpired || voting} className={`w-full text-left rounded-xl overflow-hidden relative border transition-all ${isMyVote ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/10' : 'border-gray-200 dark:border-navy-300 hover:border-brand-300'} ${!hasVoted && !isExpired ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}>
                {(hasVoted || isExpired) && <div className={`absolute inset-0 ${isCorrect ? 'bg-emerald-400/15' : 'bg-brand-400/10'} transition-all`} style={{ width: `${pct}%` }} />}
                <div className="relative px-3 py-2.5 flex items-center justify-between">
                  <span className={`text-sm font-medium ${isMyVote ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {option}
                    {isMyVote && <Check className="inline h-3.5 w-3.5 ml-1" />}
                    {poll.is_quiz && hasVoted && isCorrect && <span className="ml-1 text-xs text-emerald-500 font-bold">✓ Correct</span>}
                    {poll.is_quiz && hasVoted && isMyVote && !isCorrect && <span className="ml-1 text-xs text-red-500 font-bold">✗ Wrong</span>}
                  </span>
                  {(hasVoted || isExpired) && <span className="text-xs font-bold text-gray-500">{pct.toFixed(0)}%</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{totalVotes} votes</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{isExpired ? 'Ended' : timeLeft}</span>
        </div>
      </div>
    </div>
  );
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}
