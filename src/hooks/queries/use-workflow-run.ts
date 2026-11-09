"use client";
import { getWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { useRunGroupLive } from "@/stores/run-group-live";

/**
 * A run in one of these states changes only when the person acts on it (the action's answer updates the
 * cache) or not at all, so it is not polled.
 */
export const IDLE_RUN_STATUSES = ["completed", "cancelled", "failed", "waiting_for_input", "waiting_for_review"];

export const useWorkflowRun = (id: string | null) => {
  const liveGroupId = useRunGroupLive((state) => state.connectedGroupId);
  return useQuery({
    queryKey: videoWorkflowKeys.run(id),
    queryFn: () => getWorkflowRun(id!),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) => {
      const run = query.state.data;
      if (run && IDLE_RUN_STATUSES.includes(run.status)) return false;
      // A run of a batch video run whose changes arrive over the hub needs no polling.
      if (run?.runGroupId && liveGroupId && run.runGroupId.toLowerCase() === liveGroupId.toLowerCase()) return false;
      return 2_000;
    },
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
};
