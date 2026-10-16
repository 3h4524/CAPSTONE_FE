"use client";

import { listAiVideoTemplates, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useAiVideoTemplates = () => useQuery({
  queryKey: videoWorkflowKeys.aiTemplates(),
  queryFn: listAiVideoTemplates,
  staleTime: 10 * 60_000,
});
