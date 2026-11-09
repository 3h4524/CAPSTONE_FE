"use client";
import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { IDLE_RUN_STATUSES } from "@/hooks/queries/use-workflow-run";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { WorkflowRun } from "@/types/video-workflow";

export const useRunVideos = (runId: string | null) => {
  const client = useAppQueryClient();
  return useQuery({
    queryKey: videoWorkflowKeys.videos(runId),
    queryFn: () => listRunVideos(runId!),
    enabled: Boolean(runId),
    staleTime: 0,
    refetchInterval: query => {
      const videos = query.state.data;
      // No video yet: the run is waiting at Mockup Approval. The action that moves it on refetches this list.
      if (!videos?.length || videos.every(video => video.status === "completed" || video.status === "failed")) return false;
      // A run that stopped (cancelled, or waiting for the person) leaves its queued version as it is.
      const run = client.getQueryData<WorkflowRun>(videoWorkflowKeys.run(runId));
      return run && IDLE_RUN_STATUSES.includes(run.status) ? false : 2_000;
    },
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
};
