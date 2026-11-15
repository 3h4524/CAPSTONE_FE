"use client";

import { useTranslation } from "react-i18next";

import { listStyleArtPresets, stylePresetKeys } from "@/api/style-presets";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useStylePresets = (enabled = true) => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: stylePresetKeys.list(normalizeLocale(i18n.language)),
    queryFn: () => listStyleArtPresets(),
    enabled,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
};
