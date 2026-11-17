"use client";

import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRetryFailedBatchJob } from "@/hooks/mutations/use-retry-failed-batch-job";
import { i18n } from "@/i18n/client";
import type { BatchJobDetail } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

const ACTIVE_STATUSES = ["queued", "running"];
const FINISHED_STATUSES = ["completed", "partially_completed", "failed"];

const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString(i18n.language) : "—");
export const jobStatusText = (status: string) =>
  i18n.t(`batchJobs.statuses.${status}`, { defaultValue: status.replaceAll("_", " ") });

const Counter = ({ label, value, compact }: { label: string; value: number; compact: boolean }) => (
  <div className={compact ? "bg-ink-50 rounded-md px-2.5 py-2" : "rounded-lg border p-3"}>
    <p className={cn("text-muted-foreground text-xs", !compact && "uppercase")}>{label}</p>
    <p className={cn("tabular-nums", compact ? "text-ink-900 text-base font-medium" : "mt-1 text-2xl font-semibold")}>{value}</p>
  </div>
);

type JobProgressCardProps = {
  job: BatchJobDetail;
  /** Renders without the card frame and with tighter counters, for a side panel. */
  bare?: boolean;
};

// SRS 3.4.10 Batch Job Dashboard: status, progress, counters and the retry for failed products.
export const JobProgressCard = ({ job, bare = false }: JobProgressCardProps) => {
  const { t, i18n: i18next } = useTranslation("common");
  const statusClass = i18next.language.startsWith("en") ? "capitalize" : undefined;
  const retry = useRetryFailedBatchJob();
  const active = ACTIVE_STATUSES.includes(job.status);
  const canRetry = FINISHED_STATUSES.includes(job.status) && job.counters.failed > 0;

  const body = (
    <div className={bare ? "space-y-4" : "space-y-5"}>
      {bare && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{job.batchName}</p>
          <StatusBadge status={job.status} className={statusClass}>
            {jobStatusText(job.status)}
          </StatusBadge>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {t("batchJobs.progress.processed", { processed: job.processedProducts, total: job.totalProducts })}
          </span>
          <span>{Math.round(job.progressPercentage)}%</span>
        </div>
        <Progress value={job.progressPercentage} />
        {active && <p className="text-muted-foreground text-xs">{t("batchJobs.progress.generating")}</p>}
      </div>
      <div className={cn("grid", bare ? "grid-cols-2 gap-2 @sm:grid-cols-4" : "grid-cols-2 gap-3 sm:grid-cols-4")}>
        <Counter label={t("batchJobs.progress.pending")} value={job.counters.pending} compact={bare} />
        <Counter label={t("batchJobs.progress.processing")} value={job.counters.processing} compact={bare} />
        <Counter label={t("batchJobs.progress.completed")} value={job.counters.completed} compact={bare} />
        <Counter label={t("batchJobs.progress.failed")} value={job.counters.failed} compact={bare} />
      </div>
      {canRetry && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
          <Button size="sm" disabled={retry.isPending} onClick={() => void retry.mutateAsync(job.id).catch(() => undefined)}>
            {retry.isPending ? t("batchJobs.progress.retrying") : t("batchJobs.progress.retry", { count: job.counters.failed })}
          </Button>
          <p className="text-muted-foreground text-xs">{t("batchJobs.progress.retryHint")}</p>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {t("batchJobs.progress.timeline", { started: formatTime(job.startedAt), finished: formatTime(job.completedAt), count: job.variationCount })} · {job.aspectRatio}
      </p>
    </div>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">{job.batchName}</CardTitle>
          <StatusBadge status={job.status} className={statusClass}>
            {jobStatusText(job.status)}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};
