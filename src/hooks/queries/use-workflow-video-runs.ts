"use client";

import { listWorkflowVideoRuns, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflowVideoRuns = (workflowId: string | null) =>
  useQuery({
    queryKey: videoWorkflowKeys.videoRuns(workflowId),
    queryFn: () => listWorkflowVideoRuns(workflowId!),
    enabled: Boolean(workflowId),
    staleTime: 0,
    refetchOnWindowFocus: "always",
    suppressErrorToast: true,
  });
