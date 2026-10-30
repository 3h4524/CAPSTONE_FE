"use client";

import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeType } from "@/types/workflow";

export const useNodeSettingsLocked = (type: WorkflowNodeType) => {
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const waitingReview = useWorkflowStore((state) =>
    state.nodes.some((node) => node.data.type === "review-video" && node.data.status === "waiting_for_review")
  );

  return isRunning && !(waitingReview && type === "generate-video");
};
