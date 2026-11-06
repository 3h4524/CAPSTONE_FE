"use client";

import { getMarketInsightSchedule } from "@/api/market-insights";
import { useQuery } from "@/hooks/queries/use-query";

export const useMarketInsightSchedule = () =>
  useQuery({
    queryKey: ["market-insights", "schedule"],
    queryFn: getMarketInsightSchedule,
    retry: false,
    refetchInterval: (query) => (query.state.data?.enabled ? 60000 : false),
  });
