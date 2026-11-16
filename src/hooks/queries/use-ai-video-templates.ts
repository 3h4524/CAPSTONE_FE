"use client";

import { useTranslation } from "react-i18next";

import { listAiVideoTemplates, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useAiVideoTemplates = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: videoWorkflowKeys.aiTemplates(normalizeLocale(i18n.language)),
    queryFn: listAiVideoTemplates,
    staleTime: 10 * 60_000,
  });
};
