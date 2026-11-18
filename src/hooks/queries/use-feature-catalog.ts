"use client";

import { useTranslation } from "react-i18next";

import { getFeatureCatalogRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const FEATURE_CATALOG_QUERY_KEY = ["subscription-features"];

// The plan features with the Admin's labels. Rarely changes, so it is kept for a while; until it
// loads, callers fall back to the definitions in plan-features.ts.
export const useFeatureCatalog = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: [...FEATURE_CATALOG_QUERY_KEY, normalizeLocale(i18n.language)],
    queryFn: getFeatureCatalogRequest,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
};
