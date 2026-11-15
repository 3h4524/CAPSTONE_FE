"use client";

import { usePathname } from "next/navigation";

import { getAssistantRunNudge } from "@/helpers/assistant-run-nudge";
import { useAssistantRunProgress } from "@/hooks/queries/use-assistant-run-progress";
import { useAssistantRunNudgeStore } from "@/stores/assistant-run-nudge";
import { useAuthStore } from "@/stores/auth";
import { useWorkflowStore } from "@/stores/workflow";

export const useAssistantRunNudge = () => {
  const pathname = usePathname();
  const isSeller = useAuthStore((state) => state.user?.roles.includes("Seller") ?? false);
  const openWorkflowId = useWorkflowStore((state) => state.workflowId);
  const watchedWorkflowId = useAssistantRunNudgeStore((state) => state.watchedWorkflowId);
  const seenKey = useAssistantRunNudgeStore((state) => state.seenKey);
  const markSeen = useAssistantRunNudgeStore((state) => state.markSeen);
  const workflowId = isSeller ? (pathname === "/workflows" && openWorkflowId ? openWorkflowId : watchedWorkflowId) : null;
  const { data: progress } = useAssistantRunProgress(workflowId, workflowId !== null && workflowId === watchedWorkflowId);
  const nudge = progress?.workflowId === workflowId ? getAssistantRunNudge(progress) : null;
  const visibleNudge = nudge && nudge.key !== seenKey ? nudge : null;

  return { nudge: visibleNudge, dismiss: () => (nudge ? markSeen(nudge.key) : undefined) };
};
