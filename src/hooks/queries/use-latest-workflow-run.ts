"use client";

import { getLatestWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useLatestWorkflowRun = (workflowId: string | null) => useQuery({
  queryKey: videoWorkflowKeys.latestRun(workflowId),
  queryFn: () => getLatestWorkflowRun(workflowId!),
  enabled: Boolean(workflowId),
  staleTime: 0,
  suppressErrorToast: true,
});
