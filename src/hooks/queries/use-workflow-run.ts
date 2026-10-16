"use client";
import { getWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflowRun = (id: string | null) => useQuery({ queryKey: videoWorkflowKeys.run(id), queryFn: () => getWorkflowRun(id!), enabled: Boolean(id), refetchInterval: q => q.state.data && ["completed", "cancelled", "failed"].includes(q.state.data.status) ? false : 2000 });
