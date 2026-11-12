"use client";

import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupTarget } from "@/types/video-workflow";

/** A run in these states is not being made any more: its share of the batch is complete. */
const SETTLED = new Set(["waiting_for_review", "completed", "failed", "cancelled", "waiting_for_input"]);
const ACTIVE = new Set(["queued", "running"]);

/**
 * How far a batch video run is as a whole, 0-100: each video counts for an equal share, a finished one in full, one
 * being made by its own progress and a queued one not at all. Four videos with one done is 25%, not the 100% of the
 * run that finished. Floored, so 100 only shows once every video is done.
 */
export const groupVideoProgress = (targets: Pick<RunGroupTarget, "runId" | "runStatus" | "progress">[]) => {
  const runs = targets.filter((target) => target.runId);
  if (runs.length === 0) return 0;
  const total = runs.reduce((sum, target) => {
    const status = target.runStatus ?? "";
    if (SETTLED.has(status)) return sum + 100;
    if (status === "running") return sum + Math.max(0, Math.min(100, target.progress));
    return sum;
  }, 0);
  return Math.floor(total / runs.length);
};

/**
 * The batch video run open on the canvas while its videos are being made: its overall progress, and whether any
 * video is still queued or rendering. Null without such a run, so a node falls back to its own run's progress.
 */
export const useGroupVideoProgress = (): { progress: number; active: boolean } | null => {
  const { data: group } = useRunGroup(useRunGroupId());
  const workflowId = useWorkflowStore((state) => state.workflowId);
  if (!group || group.workflowId !== workflowId || group.status === "waiting_for_targets") return null;
  const runs = group.targets.filter((target) => target.runId);
  if (runs.length === 0) return null;
  return {
    progress: groupVideoProgress(runs),
    active: runs.some((target) => ACTIVE.has(target.runStatus ?? "")),
  };
};
