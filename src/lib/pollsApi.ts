import { supabase } from '@/lib/supabase';
import type { Poll } from '@/lib/types';

export async function createPollForPost(postId: string, poll: { question: string; options: string[]; is_quiz: boolean; correct_option: number | null; duration_hours: number }): Promise<Poll | null> {
  const expiresAt = new Date(Date.now() + poll.duration_hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('polls').insert({ post_id: postId, question: poll.question, options: poll.options, is_quiz: poll.is_quiz, correct_option: poll.correct_option, duration_hours: poll.duration_hours, expires_at: expiresAt }).select('*').single();
  if (error) throw error;
  return data;
}

export async function fetchPollForPost(postId: string, currentUserId?: string): Promise<Poll | null> {
  const { data, error } = await supabase.from('polls').select('*').eq('post_id', postId).maybeSingle();
  if (error || !data) return null;
  let myVote: number | null = null;
  let voteCounts: number[] = [];
  if (currentUserId) {
    const { data: vote } = await supabase.from('poll_votes').select('option_index').eq('poll_id', data.id).eq('user_id', currentUserId).maybeSingle();
    myVote = vote?.option_index ?? null;
  }
  const { data: votes } = await supabase.from('poll_votes').select('option_index').eq('poll_id', data.id);
  voteCounts = new Array(data.options.length).fill(0);
  (votes || []).forEach((v) => { if (v.option_index >= 0 && v.option_index < voteCounts.length) voteCounts[v.option_index]++; });
  return { ...data, my_vote: myVote, vote_counts: voteCounts };
}

export async function votePoll(pollId: string, optionIndex: number): Promise<void> {
  const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, option_index: optionIndex });
  if (error) throw error;
  const { count } = await supabase.from('poll_votes').select('id', { count: 'exact', head: true }).eq('poll_id', pollId);
  await supabase.from('polls').update({ total_votes: count || 0 }).eq('id', pollId);
}
