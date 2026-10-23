"use client";
import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useRunVideos = (runId: string | null) => useQuery({
  queryKey: videoWorkflowKeys.videos(runId),
  queryFn: () => listRunVideos(runId!),
  enabled: Boolean(runId),
  staleTime: 0,
  refetchInterval: query => query.state.data?.length && query.state.data.every(video => video.status === "completed" || video.status === "failed") ? false : 2_000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
});
