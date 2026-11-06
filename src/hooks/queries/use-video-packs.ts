"use client";

import { listVideoPacks, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useVideoPacks = () =>
  useQuery({
    queryKey: videoWorkflowKeys.videoPacks(),
    queryFn: listVideoPacks,
    staleTime: 10 * 60_000,
  });
