"use client";
import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { ACTIVE_RUN_POLL_MS, useRunIsWorking } from "@/hooks/queries/use-workflow-run";

const FINISHED_VIDEO_STATUSES = ["completed", "failed"];

export const useRunVideos = (runId: string | null) => {
  const working = useRunIsWorking(runId);
  return useQuery({
    queryKey: videoWorkflowKeys.videos(runId),
    queryFn: () => listRunVideos(runId!),
    enabled: Boolean(runId),
    staleTime: 0,
    // An empty list is not "still rendering": it stops polling once the run is no longer working.
    refetchInterval: query => {
      const videos = query.state.data;
      const allDone = Boolean(videos?.length) && videos!.every(video => FINISHED_VIDEO_STATUSES.includes(video.status));
      return working && !allDone ? ACTIVE_RUN_POLL_MS : false;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
};
