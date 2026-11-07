"use client";

import { listAiCharacterModels, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useAiCharacterModels = () =>
  useQuery({
    queryKey: videoWorkflowKeys.aiCharacters(),
    queryFn: listAiCharacterModels,
    staleTime: 10 * 60_000,
  });
