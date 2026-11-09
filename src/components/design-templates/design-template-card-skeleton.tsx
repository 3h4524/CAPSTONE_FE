export function DesignTemplateCardSkeleton() {
  return (
    <div className="border-ink-200 bg-card overflow-hidden rounded-[18px] border" aria-hidden="true">
      <div className="bg-ink-200 aspect-[4/3] animate-pulse" />
      <div className="space-y-4 p-5">
        <div className="bg-ink-100 h-4 w-36 animate-pulse rounded" />
        <div className="bg-ink-200 h-6 w-3/4 animate-pulse rounded" />
        <div className="space-y-2">
          <div className="bg-ink-100 h-4 animate-pulse rounded" />
          <div className="bg-ink-100 h-4 w-4/5 animate-pulse rounded" />
        </div>
        <div className="bg-ink-100 h-9 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
