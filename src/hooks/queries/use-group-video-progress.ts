"use client";

import { videoStatusOf } from "@/hooks/queries/use-group-videos";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupTarget } from "@/types/video-workflow";

/** A run in these states is not being made any more: its share of the batch is complete. */
const SETTLED = new Set(["waiting_for_review", "completed", "failed", "cancelled", "waiting_for_input"]);
const ACTIVE = new Set(["queued", "running"]);
const AFTER_RENDER = new Set(["review-video", "export-zip", "publish-etsy"]);

const rendered = (target: Pick<RunGroupTarget, "currentStep" | "generateVideo">) =>
  target.generateVideo?.status === "succeeded" || AFTER_RENDER.has(target.currentStep ?? "");

/**
 * How far a batch video run is as a whole, 0-100: each video counts for an equal share, a finished one in full, one
 * being made by its own progress and a queued one not at all. Four videos with one done is 25%, not the 100% of the
 * run that finished. Floored, so 100 only shows once every video is done.
 */
export const groupVideoProgress = (targets: (Pick<RunGroupTarget, "runId" | "runStatus" | "videoStatus" | "progress"> & Partial<Pick<RunGroupTarget, "currentStep" | "generateVideo">>)[]) => {
  const runs = targets.filter((target) => target.runId);
  if (runs.length === 0) return 0;
  const total = runs.reduce((sum, target) => {
    // The video's own status: Push to Printify, beside it, neither holds the bar back nor fails it.
    const status = videoStatusOf(target);
    if (rendered({ ...target, currentStep: target.currentStep ?? null }) || SETTLED.has(status)) return sum + 100;
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
    active: runs.some((target) => !rendered(target) && ACTIVE.has(videoStatusOf(target))),
  };
};
