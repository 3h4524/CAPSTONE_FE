"use client";
import { getWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflowRun = (id: string | null) => useQuery({
  queryKey: videoWorkflowKeys.run(id),
  queryFn: () => getWorkflowRun(id!),
  enabled: Boolean(id),
  staleTime: 0,
  refetchInterval: query => query.state.data && ["completed", "cancelled", "failed"].includes(query.state.data.status) ? false : 2_000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
});
