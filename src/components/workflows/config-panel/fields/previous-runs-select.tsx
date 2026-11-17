"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { SELECT_CLEARABLE_TRIGGER, SelectClearButton } from "@/components/commons/forms/select-clear-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { RUN_GROUP_PARAM } from "@/constants/run-group";
import { PANEL_SELECT_CONTENT_CLASS } from "@/constants/workflow-panel";
import { useBatchJobs } from "@/hooks/queries/use-batch-jobs";
import { BATCH_JOB_PARAM, NEXT_PART_PARAM } from "@/hooks/use-batch-run";
import { VIDEO_RUN_PARAM } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

// The dot before each run, so finished, failed and running jobs tell apart at a glance.
const STATUS_DOTS: Record<string, string> = {
  completed: "bg-emerald-500",
  partially_completed: "bg-amber-500",
  failed: "bg-rose-500",
  queued: "bg-indigo-400",
  running: "bg-indigo-500",
  paused: "bg-ink-400",
};

const formatDate = (value: string | null, locale: string) =>
  value ? new Date(value).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }) : "";
const statusDot = (status: string) => STATUS_DOTS[status.toLowerCase()] ?? "bg-ink-300";

// Where a run was started, when it was not from the workflow that is open. Runs from before this was
// recorded, or started outside a workflow, have nothing to say.
const runOrigin = (runWorkflowId: string | null | undefined, openWorkflowId: string | null) =>
  !runWorkflowId || !openWorkflowId ? null : runWorkflowId === openWorkflowId ? "this" : "another";

type PreviousRunsSelectProps = {
  batchId: string;
};

// Opens an earlier job of the batch on the canvas to see its images and mock-ups or retry its failed
// products. It never changes what Run does: that always generates for the batch's pending products.
export const PreviousRunsSelect = ({ batchId }: PreviousRunsSelectProps) => {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const openRunId = useSearchParams().get(BATCH_JOB_PARAM);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: jobs } = useBatchJobs(batchId || undefined);

  // Numbered like the Jobs menu on the Batches page (oldest is #1) so the two lists agree. Drafts
  // have not started, so there is nothing to see in them.
  const startedRuns = (jobs ?? [])
    .map((job, index) => ({ job, number: jobs ? jobs.length - index : 0 }))
    .filter(({ job }) => job.status.toLowerCase() !== "draft");
  if (!batchId || startedRuns.length === 0) return null;

  const openRun = startedRuns.find(({ job }) => job.id === openRunId);

  const openRunById = (jobId: string) => {
    // The list answers "" when its value stops matching an item, which is no run to open.
    if (!jobId) return;
    const params = new URLSearchParams(window.location.search);
    params.set(BATCH_JOB_PARAM, jobId);
    // Looking at an earlier run starts nothing after it.
    params.delete(NEXT_PART_PARAM);
    router.replace(`/workflows?${params.toString()}`);
  };

  // Stops looking at the earlier run; the canvas goes back to the workflow without a run open. Its videos go too:
  // opening the run added its batch video run and the run of its first video, which would keep their steps shown.
  const closeRun = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete(BATCH_JOB_PARAM);
    params.delete(NEXT_PART_PARAM);
    params.delete(RUN_GROUP_PARAM);
    params.delete(VIDEO_RUN_PARAM);
    const state = useWorkflowStore.getState();
    state.setVideoRunId(null);
    state.resetStatuses();
    router.replace(`/workflows?${params.toString()}`);
  };
  const canClose = Boolean(openRun) && !isRunning;
  const statusText = (status: string) => {
    const humanized = status.replaceAll("_", " ");
    return t(`batches.statuses.${status.toLowerCase()}`, { defaultValue: humanized.charAt(0).toUpperCase() + humanized.slice(1) });
  };
  const runTitle = (number: number, status: string) => t("workflowConfig.previousRuns.runTitle", { number, status: statusText(status) });
  const originText = (runWorkflowId: string | null | undefined) => {
    const origin = runOrigin(runWorkflowId, workflowId);
    return origin === "this" ? t("workflowConfig.previousRuns.thisWorkflow") : origin === "another" ? t("workflowConfig.previousRuns.anotherWorkflow") : "";
  };

  return (
    <PanelSection
      title={t("workflowConfig.previousRuns.title")}
      aside={<span className="text-muted-foreground text-xs tabular-nums">{startedRuns.length}</span>}
      description={t("workflowConfig.previousRuns.description")}
    >
      <Select value={openRun?.job.id ?? ""} onValueChange={openRunById} disabled={isRunning}>
        <div className="relative min-w-0">
        <SelectTrigger
          id="previous-runs"
          aria-label={t("workflowConfig.previousRuns.title")}
          className={cn("bg-card w-full min-w-0", canClose && SELECT_CLEARABLE_TRIGGER)}
        >
          {/* Short on purpose: the full details are in the list, and a long value would push the panel wider. */}
          <SelectValue placeholder={t("workflowConfig.previousRuns.placeholder")}>
            {openRun && (
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", statusDot(openRun.job.status))} aria-hidden="true" />
                <span className="truncate">{runTitle(openRun.number, openRun.job.status)}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        {canClose && <SelectClearButton label={t("workflowConfig.previousRuns.closeRun")} onClear={closeRun} />}
        </div>
        <SelectContent position="popper" className={PANEL_SELECT_CONTENT_CLASS}>
          {startedRuns.map(({ job, number }) => (
            <SelectItem key={job.id} value={job.id}>
              <span className="flex items-start gap-2">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusDot(job.status))} aria-hidden="true" />
                <span className="flex flex-col">
                  <span>{runTitle(number, job.status)}</span>
                  <span className="text-muted-foreground text-xs">
                    {`${t("workflowConfig.fields.productCount", { count: job.totalProducts })} · ${formatDate(job.startedAt ?? job.createdAt, i18n.language)}${originText(job.workflowId)}`}
                  </span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PanelSection>
  );
};
