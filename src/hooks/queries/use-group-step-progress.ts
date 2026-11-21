"use client";

import { toCanvasStatus } from "@/helpers/workflow-run";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupTarget } from "@/types/video-workflow";

const STEP_FIELDS = {
  "generate-video": "generateVideo",
  "review-video": "reviewVideo",
  "export-zip": "exportZip",
} as const;

export const groupStepProgress = (targets: RunGroupTarget[], type: string) => {
  const field = STEP_FIELDS[type as keyof typeof STEP_FIELDS];
  const runs = targets.filter((target) => target.runId);
  if (!field || runs.length === 0 || runs.some((target) => !target[field])) return null;
  const steps = runs.map((target) => target[field]!);
  const statuses = steps.map((step) => step.status);
  const status = statuses.every((value) => value === "succeeded")
    ? "succeeded"
    : statuses.includes("running") ? "running"
    : statuses.includes("failed") ? "failed"
    : statuses.includes("waiting_for_review") ? "waiting_for_review"
    : statuses.includes("waiting_for_input") ? "waiting_for_input"
    : statuses.includes("cancelled") ? "cancelled"
    : statuses.includes("succeeded") ? "running" : "pending";
  const progress = Math.floor(steps.reduce((sum, step) => sum +
    (step.status === "succeeded" ? 100 : Math.max(0, Math.min(100, step.progress))), 0) / steps.length);
  return { status: toCanvasStatus(status), progress };
};

export const useGroupStepProgress = (type: string) => {
  const { data: group } = useRunGroup(useRunGroupId());
  const workflowId = useWorkflowStore((state) => state.workflowId);
  if (!group || group.workflowId !== workflowId || group.status === "waiting_for_targets") return null;
  return groupStepProgress(group.targets, type);
};
