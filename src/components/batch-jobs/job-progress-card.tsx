"use client";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRetryFailedBatchJob } from "@/hooks/mutations/use-retry-failed-batch-job";
import type { BatchJobDetail } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

const ACTIVE_STATUSES = ["queued", "running"];
const FINISHED_STATUSES = ["completed", "partially_completed", "failed"];

const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
export const jobStatusText = (status: string) => (status === "image_review_required" ? "Ready for review" : status.replaceAll("_", " "));

const Counter = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground text-xs uppercase">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

type JobProgressCardProps = {
  job: BatchJobDetail;
  /** Renders without the card frame and with tighter counters, for a side panel. */
  bare?: boolean;
};

// SRS 3.4.10 Batch Job Dashboard: status, progress, counters and the retry for failed products.
export const JobProgressCard = ({ job, bare = false }: JobProgressCardProps) => {
  const retry = useRetryFailedBatchJob();
  const active = ACTIVE_STATUSES.includes(job.status);
  const canRetry = FINISHED_STATUSES.includes(job.status) && job.counters.failed > 0;

  const body = (
    <div className="space-y-5">
      {bare && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{job.batchName}</p>
          <StatusBadge status={job.status} className="capitalize">
            {jobStatusText(job.status)}
          </StatusBadge>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {job.processedProducts} of {job.totalProducts} products processed
          </span>
          <span>{Math.round(job.progressPercentage)}%</span>
        </div>
        <Progress value={job.progressPercentage} />
        {active && <p className="text-muted-foreground text-xs">Generating images… this updates automatically.</p>}
      </div>
      <div className={cn("grid gap-3", bare ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        <Counter label="Pending" value={job.counters.pending} />
        <Counter label="Processing" value={job.counters.processing} />
        <Counter label="Completed" value={job.counters.completed} />
        <Counter label="Failed" value={job.counters.failed} />
      </div>
      {canRetry && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
          <Button size="sm" disabled={retry.isPending} onClick={() => void retry.mutateAsync(job.id).catch(() => undefined)}>
            {retry.isPending ? "Retrying…" : `Retry failed products (${job.counters.failed})`}
          </Button>
          <p className="text-muted-foreground text-xs">Only the failed products are generated again. Each retry uses image-generation quota again.</p>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Started {formatTime(job.startedAt)} · Finished {formatTime(job.completedAt)} · {job.variationCount} per product · {job.aspectRatio}
      </p>
    </div>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">{job.batchName}</CardTitle>
          <StatusBadge status={job.status} className="capitalize">
            {jobStatusText(job.status)}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};
