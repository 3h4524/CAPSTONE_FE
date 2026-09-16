"use client";

import { getUsageOverview } from "@/api/usage";
import { useQuery } from "@/hooks/queries/use-query";

export const useUsageOverview = (days: number) =>
  useQuery({
    queryKey: ["usage-overview", days],
    queryFn: () => getUsageOverview(days),
    retry: false,
    suppressErrorToast: true,
  });
