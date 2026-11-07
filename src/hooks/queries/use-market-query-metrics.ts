"use client";

import { getMarketQueryMetrics } from "@/api/market-insights";
import { useQuery } from "@/hooks/queries/use-query";

export const marketInsightsKeys = {
  all: ["market-insights"] as const,
  query: (keyword: string) => ["market-insights", "query", keyword] as const,
};

export const useMarketQueryMetrics = (keyword: string) =>
  useQuery({
    queryKey: marketInsightsKeys.query(keyword),
    queryFn: () => getMarketQueryMetrics(keyword),
    enabled: Boolean(keyword),
    retry: false,
    suppressErrorToast: true,
  });
