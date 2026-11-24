"use client";

import { hasRunPreview } from "@/helpers/workflow-run-view";
import { useNodeRunStatus } from "@/hooks/use-node-run-status";
import { useRunEffects } from "@/hooks/use-run-effects";
import type { WorkflowNodeData } from "@/types/workflow";

export const useRunPreviewVisible = (data: WorkflowNodeData) => {
  const effects = useRunEffects();
  const { status } = useNodeRunStatus(data);
  return effects && hasRunPreview(data.type) && status !== "idle";
};
