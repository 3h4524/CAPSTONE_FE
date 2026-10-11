"use client";
import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useRunVideos = (runId: string | null) => useQuery({ queryKey: videoWorkflowKeys.videos(runId), queryFn: () => listRunVideos(runId!), enabled: Boolean(runId), staleTime: 15_000, refetchInterval: query => query.state.data?.length && query.state.data.every(v => v.status === "completed" || v.status === "failed") ? 8 * 60_000 : 5000 });
