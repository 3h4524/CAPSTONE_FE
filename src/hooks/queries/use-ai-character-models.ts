"use client";

import { useTranslation } from "react-i18next";

import { listAiCharacterModels, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useAiCharacterModels = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: videoWorkflowKeys.aiCharacters(normalizeLocale(i18n.language)),
    queryFn: listAiCharacterModels,
    staleTime: 10 * 60_000,
  });
};
