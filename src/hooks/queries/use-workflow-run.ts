"use client";
import { getWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { useQuery as useBaseQuery } from "@tanstack/react-query";

const FINISHED_RUN_STATUSES = ["completed", "cancelled", "failed"];
const WAITING_RUN_STATUSES = ["waiting_for_input", "waiting_for_review"];

/** While the server works on the run its steps move every few seconds. */
export const ACTIVE_RUN_POLL_MS = 2_000;
/** A run waiting for an approval only changes when someone approves, possibly in another tab. */
export const WAITING_RUN_POLL_MS = 15_000;

export const useWorkflowRun = (id: string | null) => useQuery({
  queryKey: videoWorkflowKeys.run(id),
  queryFn: () => getWorkflowRun(id!),
  enabled: Boolean(id),
  staleTime: 0,
  refetchInterval: query => {
    const status = query.state.data?.status;
    if (status && FINISHED_RUN_STATUSES.includes(status)) return false;
    return status && WAITING_RUN_STATUSES.includes(status) ? WAITING_RUN_POLL_MS : ACTIVE_RUN_POLL_MS;
  },
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
});

/**
 * Whether the server is working on the run, read from the run already being polled: this never fetches it.
 * Media lists of the run only need polling while it is, since nothing renders while it waits or after it ends.
 */
export const useRunIsWorking = (id: string | null) => {
  const { data } = useBaseQuery({
    queryKey: videoWorkflowKeys.run(id),
    queryFn: () => getWorkflowRun(id!),
    enabled: false,
  });
  // Unknown until the run is read; poll meanwhile rather than miss a render.
  return data === undefined || data.status === "running";
};
