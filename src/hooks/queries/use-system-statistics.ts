import { useQuery } from "@tanstack/react-query";

import { getSystemStatisticsOverview } from "@/api/system-statistics";
import type { StatisticsFilterDto } from "@/types/system-statistics";

export const statisticsKeys = {
  all: ["system-statistics"] as const,
  overview: (filter: StatisticsFilterDto) =>
    [...statisticsKeys.all, "overview", filter] as const,
};

export function useSystemStatisticsOverview(filter: StatisticsFilterDto) {
  return useQuery({
    queryKey: statisticsKeys.overview(filter),
    queryFn: () => getSystemStatisticsOverview(filter),
  });
}
