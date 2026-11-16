"use client";

import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNodeStatus } from "@/types/workflow";

export type GroupPrintify = {
  /** The node's status for the batch: running while any design is pushed, failed once one failed, done when all are. */
  status: WorkflowNodeStatus;
  total: number;
  done: number;
  failed: number;
  working: number;
  /** The designs that have a Push to Printify step. */
  targets: RunGroupTarget[];
};

/** Push to Printify across the designs of a batch run; null when none of them has the step yet. */
export const groupPrintify = (targets: RunGroupTarget[]): GroupPrintify | null => {
  const steps = targets.filter((target) => target.runId && target.printify);
  if (steps.length === 0) return null;
  const count = (status: string) => steps.filter((target) => target.printify!.status === status).length;
  const done = count("succeeded");
  const failed = count("failed");
  const working = count("running");
  const status: WorkflowNodeStatus = working > 0 ? "running"
    : failed > 0 ? "failed"
    : done === steps.length ? "success"
    : count("cancelled") > 0 ? "cancelled"
    : "idle";
  return { status, total: steps.length, done, failed, working, targets: steps };
};

/**
 * The Push to Printify steps of the batch video run open on the canvas. Printify runs beside the videos, so the
 * batch's video progress says nothing about it: this is what its node and panel show instead.
 */
export const useGroupPrintify = (): GroupPrintify | null => {
  const { data: group } = useRunGroup(useRunGroupId());
  const workflowId = useWorkflowStore((state) => state.workflowId);
  if (!group || group.workflowId !== workflowId || group.status === "waiting_for_targets") return null;
  return groupPrintify(group.targets);
};
