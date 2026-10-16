"use client";

import { listVideoTemplates, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useVideoTemplates = () => useQuery({
  queryKey: videoWorkflowKeys.templates(),
  queryFn: listVideoTemplates,
  staleTime: 10 * 60_000,
});
