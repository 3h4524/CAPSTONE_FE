export function DesignTemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-ink-200 bg-card" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-ink-200" />
      <div className="space-y-4 p-5">
        <div className="h-4 w-36 animate-pulse rounded bg-ink-100" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-ink-200" />
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-ink-100" />
        </div>
        <div className="h-9 animate-pulse rounded-lg bg-ink-100" />
      </div>
    </div>
  );
}
