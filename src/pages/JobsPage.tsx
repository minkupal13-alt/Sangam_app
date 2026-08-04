import { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Loader2,
  X,
  MapPin,
  Bookmark,
  BookmarkCheck,
  DollarSign,
  Building2,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  work_type: 'remote' | 'hybrid' | 'onsite';
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  requirements: string | null;
  apply_url: string | null;
  created_by: string;
  created_at: string;
}

const WORK_TYPES: ('all' | 'remote' | 'hybrid' | 'onsite')[] = ['all', 'remote', 'hybrid', 'onsite'];
const JOB_TYPES: ('all' | 'full-time' | 'part-time' | 'contract' | 'internship')[] = [
  'all',
  'full-time',
  'part-time',
  'contract',
  'internship',
];

function formatSalary(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Not specified';
  const fmt = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
  };
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function JobsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState<(typeof WORK_TYPES)[number]>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<(typeof JOB_TYPES)[number]>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState<Set<string>>(new Set());

  usePageTitle('Jobs | Sangam');

  useEffect(() => {
    loadJobs();
  }, [profile]);

  async function loadJobs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('loadJobs error', error);
    }
    if (data) {
      setJobs(data as Job[]);
    }

    // Load bookmarks
    if (profile) {
      const { data: bookmarks } = await supabase
        .from('job_bookmarks')
        .select('job_id')
        .eq('user_id', profile.id);
      setBookmarkedIds(new Set((bookmarks || []).map((b) => b.job_id)));
    }

    setLoading(false);
  }

  async function handleBookmark(jobId: string) {
    if (!profile) return;
    setBookmarkLoading((prev) => new Set([...prev, jobId]));
    const { error } = await supabase.from('job_bookmarks').insert({
      job_id: jobId,
      user_id: profile.id,
    });
    if (!error) {
      setBookmarkedIds((prev) => new Set([...prev, jobId]));
    }
    setBookmarkLoading((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }

  async function handleUnbookmark(jobId: string) {
    if (!profile) return;
    setBookmarkLoading((prev) => new Set([...prev, jobId]));
    const { error } = await supabase
      .from('job_bookmarks')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', profile.id);
    if (!error) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
    setBookmarkLoading((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const location = formData.get('location') as string;
    const work_type = formData.get('work_type') as Job['work_type'];
    const job_type = formData.get('job_type') as Job['job_type'];
    const salary_min = formData.get('salary_min') as string;
    const salary_max = formData.get('salary_max') as string;
    const description = formData.get('description') as string;
    const requirements = formData.get('requirements') as string;
    const apply_url = formData.get('apply_url') as string;

    if (!title.trim() || !company.trim()) return;

    const { error } = await supabase.from('jobs').insert({
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || null,
      work_type,
      job_type,
      salary_min: salary_min ? parseInt(salary_min, 10) : null,
      salary_max: salary_max ? parseInt(salary_max, 10) : null,
      description: description.trim() || null,
      requirements: requirements.trim() || null,
      apply_url: apply_url.trim() || null,
      created_by: profile.id,
    });

    if (error) {
      console.error('create job error', error);
      return;
    }

    setShowCreate(false);
    form.reset();
    loadJobs();
  }

  const filtered = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase());
    const matchesWork = workTypeFilter === 'all' || job.work_type === workTypeFilter;
    const matchesJobType = jobTypeFilter === 'all' || job.job_type === jobTypeFilter;
    return matchesSearch && matchesWork && matchesJobType;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Jobs</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Post a Job</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs or companies..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        <div className="flex gap-1.5 flex-shrink-0">
          {WORK_TYPES.map((wt) => (
            <button
              key={wt}
              onClick={() => setWorkTypeFilter(wt)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all active:scale-95 ${
                workTypeFilter === wt
                  ? 'bg-sangam-gradient text-white'
                  : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
              }`}
            >
              {wt}
            </button>
          ))}
        </div>
        <div className="w-px bg-gray-200 dark:bg-navy-300 flex-shrink-0" />
        <div className="flex gap-1.5 flex-shrink-0">
          {JOB_TYPES.map((jt) => (
            <button
              key={jt}
              onClick={() => setJobTypeFilter(jt)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all active:scale-95 ${
                jobTypeFilter === jt
                  ? 'bg-sangam-gradient text-white'
                  : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
              }`}
            >
              {jt}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">No jobs found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || workTypeFilter !== 'all' || jobTypeFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Post the first job listing!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const isBookmarked = bookmarkedIds.has(job.id);
            const isLoading = bookmarkLoading.has(job.id);
            return (
              <div
                key={job.id}
                className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{job.company}</span>
                    </div>
                  </div>
                  {profile && (
                    <button
                      onClick={() => (isBookmarked ? handleUnbookmark(job.id) : handleBookmark(job.id))}
                      disabled={isLoading}
                      className="flex-shrink-0 h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500 hover:text-brand-500 transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-brand-500" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {job.location && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-navy-300 text-xs font-medium text-gray-600 dark:text-gray-300">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-xs font-semibold text-brand-600 dark:text-brand-400 capitalize">
                    {job.work_type}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-coral-50 dark:bg-coral-900/20 text-xs font-semibold text-coral-600 dark:text-coral-400 capitalize">
                    {job.job_type}
                  </span>
                </div>

                {/* Salary */}
                <div className="flex items-center gap-1.5 mt-3 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </span>
                </div>

                {/* Description */}
                {job.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {/* Apply */}
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform"
                  >
                    Apply Now
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post a Job Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
              <button
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">Post a Job</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Job Title
                </label>
                <input
                  name="title"
                  required
                  placeholder="Senior Frontend Engineer"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <input
                  name="company"
                  required
                  placeholder="Acme Inc."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  name="location"
                  placeholder="San Francisco, CA"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Work Type
                  </label>
                  <select
                    name="work_type"
                    defaultValue="remote"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Job Type
                  </label>
                  <select
                    name="job_type"
                    defaultValue="full-time"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Salary Min ($)
                  </label>
                  <input
                    name="salary_min"
                    type="number"
                    min="0"
                    placeholder="50000"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Salary Max ($)
                  </label>
                  <input
                    name="salary_max"
                    type="number"
                    min="0"
                    placeholder="120000"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Job description..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Requirements
                </label>
                <textarea
                  name="requirements"
                  rows={3}
                  placeholder="Job requirements..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Apply URL
                </label>
                <input
                  name="apply_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
              >
                Post Job
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
