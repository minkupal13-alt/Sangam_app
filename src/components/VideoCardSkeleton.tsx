export default function VideoCardSkeleton() {
  return (
    <div>
      <div className="aspect-video rounded-2xl skeleton" />
      <div className="flex gap-3 mt-3">
        <div className="h-9 w-9 rounded-full skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-3 w-2/3 rounded skeleton" />
          <div className="h-3 w-1/2 rounded skeleton" />
        </div>
      </div>
    </div>
  );
}
