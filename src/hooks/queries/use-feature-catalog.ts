"use client";

import { getFeatureCatalogRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";

export const FEATURE_CATALOG_QUERY_KEY = ["subscription-features"];

// The plan features with the Admin's labels. Rarely changes, so it is kept for a while; until it
// loads, callers fall back to the definitions in plan-features.ts.
export const useFeatureCatalog = () =>
  useQuery({
    queryKey: FEATURE_CATALOG_QUERY_KEY,
    queryFn: getFeatureCatalogRequest,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
