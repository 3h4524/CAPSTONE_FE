"use client";

import { useTranslation } from "react-i18next";

import { listVideoTemplates, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useVideoTemplates = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: videoWorkflowKeys.templates(normalizeLocale(i18n.language)),
    queryFn: listVideoTemplates,
    staleTime: 10 * 60_000,
  });
};
