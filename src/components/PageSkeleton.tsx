/**
 * Full-page skeleton loader for route-level Suspense fallbacks.
 * Renders a shimmer header bar + skeleton cards so transitions feel
 * smooth instead of showing a bare spinner.
 */

interface PageSkeletonProps {
  variant?: 'feed' | 'list' | 'grid' | 'detail';
}

export default function PageSkeleton({ variant = 'list' }: PageSkeletonProps) {
  if (variant === 'feed') {
    return (
      <div className="max-w-2xl mx-auto w-full pt-2">
        <div className="sticky top-0 z-30 bg-[#fafaf9]/90 dark:bg-[#0b1220]/90 backdrop-blur-xl border-b border-gray-100 dark:border-navy-300 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full skeleton" />
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-full skeleton" />
              <div className="h-7 w-20 rounded-full skeleton" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full skeleton" />
              <div className="h-5 w-5 rounded-full skeleton" />
              <div className="h-8 w-8 rounded-full skeleton" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-4 py-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="h-14 w-14 rounded-full skeleton" />
              <div className="h-2 w-12 rounded skeleton" />
            </div>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mx-3 my-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
            <div className="flex gap-3">
              <div className="h-11 w-11 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded skeleton" />
                <div className="h-3 w-full rounded skeleton" />
                <div className="h-3 w-2/3 rounded skeleton" />
                <div className="h-40 w-full rounded-2xl skeleton mt-2" />
                <div className="flex gap-4 mt-2">
                  <div className="h-5 w-12 rounded skeleton" />
                  <div className="h-5 w-12 rounded skeleton" />
                  <div className="h-5 w-12 rounded skeleton" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-4">
        <div className="h-8 w-48 rounded skeleton mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="aspect-video skeleton" />
              <div className="flex gap-2 mt-2">
                <div className="h-8 w-8 rounded-full skeleton flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded skeleton" />
                  <div className="h-2 w-2/3 rounded skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-4">
        <div className="h-6 w-24 rounded skeleton mb-4" />
        <div className="h-48 w-full rounded-2xl skeleton mb-4" />
        <div className="space-y-3">
          <div className="h-6 w-3/4 rounded skeleton" />
          <div className="h-4 w-1/2 rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-5/6 rounded skeleton" />
          <div className="h-4 w-2/3 rounded skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-4">
      <div className="h-8 w-48 rounded skeleton mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded skeleton" />
                <div className="h-3 w-full rounded skeleton" />
                <div className="h-3 w-2/3 rounded skeleton" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
