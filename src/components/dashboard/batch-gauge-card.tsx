import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";

import { RingGauge, type RingTone } from "@/components/dashboard/ring-gauge";
import { Card } from "@/components/ui/card";
import type { ActiveBatch } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const STATUS_STYLES: Record<string, { tone: RingTone; chip: string }> = {
  running: { tone: "brand", chip: "bg-emerald-50 text-emerald-700" },
  queued: { tone: "slate", chip: "bg-slate-100 text-slate-600" },
  paused: { tone: "brand", chip: "bg-slate-100 text-slate-700 border border-slate-200/60" },
};

/** The newest unfinished batch job as a progress ring; an invitation to start one when none runs. */
export const BatchGaugeCard = ({ batches }: { batches: ActiveBatch[] }) => {
  const batch = batches[0];
  const style = batch ? (STATUS_STYLES[batch.status] ?? STATUS_STYLES.queued) : undefined;
  const tone: RingTone = batch && batch.failed > 0 && batch.status === "running" ? "amber" : (style?.tone ?? "slate");

  return (
    <Card className="h-full gap-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Batch in progress</h2>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {batch ? batch.name : "Nothing is running right now"}
          </p>
        </div>
        {batch && style && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
              style.chip
            )}
          >
            {batch.status}
          </span>
        )}
      </div>

      {batch ? (
        <>
          <Link href={batch.url} className="mx-auto transition-transform duration-300 hover:scale-105">
            <RingGauge value={batch.progressPercent} tone={tone} label={`${batch.name} progress`}>
              <span className="text-2xl font-semibold tabular-nums">
                {Math.round(batch.progressPercent)}%
              </span>
              <span className="text-muted-foreground text-[11px]">complete</span>
            </RingGauge>
          </Link>
          <dl className="grid grid-cols-2 gap-2 divide-x divide-slate-200 rounded-xl bg-slate-50/80 border border-slate-100 p-3 text-center text-xs">
            <div>
              <dt className="text-muted-foreground">Done</dt>
              <dd className="font-semibold tabular-nums">
                {batch.processed}/{batch.total}
                {batch.failed > 0 && (
                  <span className="text-rose-600"> · {batch.failed} failed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ends around</dt>
              <dd className="font-semibold tabular-nums">
                {batch.status === "running" && batch.estimatedCompletionAt
                  ? formatTime(batch.estimatedCompletionAt)
                  : batch.status === "paused"
                    ? "Paused"
                    : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-auto flex items-center justify-between gap-2 text-xs font-medium">
            <Link
              href={batch.url}
              className="inline-flex items-center gap-1 text-slate-800 hover:text-black hover:underline"
            >
              Open batch
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            {batches.length > 1 && (
              <Link href="/batches" className="text-muted-foreground hover:text-foreground">
                +{batches.length - 1} more
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <RingGauge value={0} tone="slate" label="Batch progress">
            <Layers3 className="text-muted-foreground size-7" aria-hidden="true" />
          </RingGauge>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#c2410c] hover:underline"
          >
            Start a batch
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
};
