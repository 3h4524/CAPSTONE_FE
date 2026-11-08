import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Hourglass,
  Inbox,
  Layers,
  PencilLine,
  Search,
  Store,
  Tag,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { PIPELINE_STAGE_LABELS, REVIEW_STAGES } from "@/constants/seller-dashboard";
import { countInProgress } from "@/helpers/seller-dashboard";
import type { PipelineStage, PipelineStageKey } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

type PipelineFunnelProps = {
  stages: PipelineStage[];
  failedProducts: number;
};

const STAGE_ICONS: Record<PipelineStageKey, LucideIcon> = {
  queued: Inbox,
  designing: PencilLine,
  design_review: Search,
  mockup: Layers,
  video: Clapperboard,
  listing: Tag,
  ready: CheckCircle2,
  published: Store,
};

/**
 * Where every product of the Seller sits, as a stepper: numbered stages joined by a line, each with
 * its products and their share of all products beneath. The stage holding the most products is
 * filled in; a stage with stuck products is outlined in red and one waiting on the Seller in amber.
 */
export const PipelineFunnel = ({ stages, failedProducts }: PipelineFunnelProps) => {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const busiest = stages.reduce<PipelineStage | null>(
    (best, stage) => (stage.count > 0 && (!best || stage.count > best.count) ? stage : best),
    null
  );

  return (
    <Card className="gap-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Production pipeline</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="font-semibold text-[#5f8a4c] dark:text-[#b0cca3]">
              {countInProgress(stages).toLocaleString()} in progress
            </span>
            {failedProducts > 0 && (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {" "}
                · {failedProducts.toLocaleString()} failed
              </span>
            )}
            {" · "}
            {total.toLocaleString()} products in all
          </p>
        </div>
        <Link
          href="/batches"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap text-ink-800 hover:text-black hover:underline"
        >
          Open batches
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="scrollbar-hide -mx-1 snap-x overflow-x-auto px-1 pb-1 lg:snap-none">
        <ol className="relative flex gap-2 lg:grid lg:min-w-[900px] lg:grid-cols-8">
          {/* The line joining the steps, from the first circle's centre to the last's. */}
          <span
            aria-hidden="true"
            className="absolute top-[17px] right-[calc(100%/16)] left-[calc(100%/16)] hidden h-0.5 rounded-full bg-ink-200 lg:block"
          />
          {stages.map((stage, index) => {
            const Icon = STAGE_ICONS[stage.stage];
            const share = total > 0 ? (stage.count / total) * 100 : 0;
            const isBusiest = busiest?.stage === stage.stage;
            const isStuck = stage.stuckCount > 0;
            const waitsOnSeller = REVIEW_STAGES.has(stage.stage) && stage.count > 0;

            return (
              <li
                key={stage.stage}
                className={cn(
                  "relative flex min-w-0 flex-col items-center max-lg:w-28 max-lg:shrink-0 max-lg:snap-start max-lg:flex-row max-lg:flex-wrap max-lg:gap-x-1.5 max-lg:rounded-xl max-lg:border max-lg:p-2.5",
                  isStuck
                    ? "max-lg:border-rose-300 dark:max-lg:border-rose-500/40"
                    : waitsOnSeller
                      ? "max-lg:border-amber-300 dark:max-lg:border-amber-500/40"
                      : "max-lg:border-ink-200/80"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums transition-transform duration-300 hover:scale-110 max-lg:size-6 max-lg:text-xs",
                    isBusiest
                      ? "border-[#2fae93] bg-[#2fae93] text-white shadow-md shadow-emerald-900/10"
                      : "bg-card border-ink-200 text-ink-700"
                  )}
                  title={isBusiest ? "Most of your products are here" : undefined}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 flex max-w-full items-center gap-1 text-xs max-lg:mt-0 max-lg:min-w-0 max-lg:flex-1",
                    isBusiest ? "font-semibold text-ink-900" : "text-ink-600"
                  )}
                >
                  <Icon className="size-3.5 shrink-0 max-lg:hidden" aria-hidden="true" />
                  <span className="truncate">{PIPELINE_STAGE_LABELS[stage.stage]}</span>
                </span>

                <div
                  className={cn(
                    "bg-card mt-3 flex w-full flex-1 flex-col gap-1 rounded-xl border p-2.5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-md max-lg:mt-2 max-lg:basis-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none",
                    isStuck
                      ? "border-rose-300 dark:border-rose-500/40"
                      : waitsOnSeller
                        ? "border-amber-300 dark:border-amber-500/40"
                        : "border-ink-200/80"
                  )}
                >
                  <span
                    className={cn(
                      "text-lg leading-none font-semibold tabular-nums",
                      stage.count === 0 && "text-muted-foreground/40"
                    )}
                  >
                    {stage.count.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {share.toFixed(1)}% of products
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isBusiest ? "bg-[#2fae93]" : "bg-ink-200"
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="mt-0.5 h-5 max-lg:h-auto max-lg:empty:hidden">
                    {isStuck ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                        <Hourglass className="size-3" aria-hidden="true" />
                        {stage.stuckCount} stuck
                      </span>
                    ) : waitsOnSeller ? (
                      <span className="rounded-md bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        Waits on you
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ul className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-[11px]">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#2fae93]" />
          Where most products are
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-rose-400" />
          Stuck: taking <span className="max-md:hidden">far</span> longer<span className="max-md:hidden"> than usual</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-amber-400" />
          Waits on your review
        </li>
      </ul>
    </Card>
  );
};
