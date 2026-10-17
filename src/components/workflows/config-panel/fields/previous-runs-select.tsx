"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { PANEL_SELECT_CONTENT_CLASS } from "@/constants/workflow-panel";
import { useBatchJobs } from "@/hooks/queries/use-batch-jobs";
import { BATCH_JOB_PARAM, NEXT_PART_PARAM } from "@/hooks/use-batch-run";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

// The dot before each run, so finished, failed and running jobs tell apart at a glance.
const STATUS_DOTS: Record<string, string> = {
  completed: "bg-emerald-500",
  partially_completed: "bg-amber-500",
  failed: "bg-rose-500",
  queued: "bg-indigo-400",
  running: "bg-indigo-500",
  paused: "bg-slate-400",
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";
const statusText = (status: string) => status.replaceAll("_", " ");
const statusDot = (status: string) => STATUS_DOTS[status.toLowerCase()] ?? "bg-slate-300";

// Where a run was started, when it was not from the workflow that is open. Runs from before this was
// recorded, or started outside a workflow, have nothing to say.
const runOrigin = (runWorkflowId: string | null | undefined, openWorkflowId: string | null) =>
  !runWorkflowId || !openWorkflowId ? "" : runWorkflowId === openWorkflowId ? " · this workflow" : " · another workflow";

type PreviousRunsSelectProps = {
  batchId: string;
};

// Opens an earlier job of the batch on the canvas to see its images and mock-ups or retry its failed
// products. It never changes what Run does: that always generates for the batch's pending products.
export const PreviousRunsSelect = ({ batchId }: PreviousRunsSelectProps) => {
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

  return (
    <PanelSection
      title="Previous runs"
      aside={<span className="text-muted-foreground text-xs tabular-nums">{startedRuns.length}</span>}
      description="See an earlier run's images and mock-ups, or retry its failed products. Run still generates for the pending products."
    >
      <Select value={openRun?.job.id} onValueChange={openRunById} disabled={isRunning}>
        <SelectTrigger id="previous-runs" aria-label="Previous runs" className="w-full min-w-0 bg-white">
          {/* Short on purpose: the full details are in the list, and a long value would push the panel wider. */}
          <SelectValue placeholder="Open an earlier run">
            {openRun && (
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", statusDot(openRun.job.status))} aria-hidden="true" />
                <span className="truncate capitalize">{`Run #${openRun.number} · ${statusText(openRun.job.status)}`}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className={PANEL_SELECT_CONTENT_CLASS}>
          {startedRuns.map(({ job, number }) => (
            <SelectItem key={job.id} value={job.id}>
              <span className="flex items-start gap-2">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusDot(job.status))} aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="capitalize">{`Run #${number} · ${statusText(job.status)}`}</span>
                  <span className="text-muted-foreground text-xs">
                    {`${job.totalProducts} ${job.totalProducts === 1 ? "product" : "products"} · ${formatDate(job.startedAt ?? job.createdAt)}${runOrigin(job.workflowId, workflowId)}`}
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
