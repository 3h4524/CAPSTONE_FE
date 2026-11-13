"use client";

import { assistantKeys, getAssistantRunProgress } from "@/api/assistant";
import { ASSISTANT_RUN_PROGRESS_POLL_MS } from "@/constants/assistant";
import { useQuery } from "@/hooks/queries/use-query";

const SETTLED_STATES = new Set(["idle", "done", "cancelled"]);

export const useAssistantRunProgress = (workflowId: string | null, keepPolling: boolean) =>
  useQuery({
    queryKey: assistantKeys.runProgress(workflowId),
    queryFn: () => getAssistantRunProgress(workflowId!),
    enabled: Boolean(workflowId),
    staleTime: 0,
    suppressErrorToast: true,
    retry: false,
    refetchInterval: (query) =>
      keepPolling || (query.state.data && !SETTLED_STATES.has(query.state.data.state)) ? ASSISTANT_RUN_PROGRESS_POLL_MS : false,
    refetchOnWindowFocus: "always",
  });
