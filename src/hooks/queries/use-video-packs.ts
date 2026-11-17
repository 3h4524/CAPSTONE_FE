"use client";

import { useTranslation } from "react-i18next";

import { listVideoPacks, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useVideoPacks = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: videoWorkflowKeys.videoPacks(normalizeLocale(i18n.language)),
    queryFn: listVideoPacks,
    staleTime: 10 * 60_000,
  });
};
