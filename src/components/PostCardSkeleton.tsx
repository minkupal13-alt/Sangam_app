export default function PostCardSkeleton() {
  return (
    <div className="mx-3 my-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
      <div className="flex gap-3">
        <div className="h-11 w-11 rounded-full skeleton" />
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
  );
}
