"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsageOverview } from "@/api/usage";

export const useUsageOverview = (days: number) =>
  useQuery({ queryKey: ["usage-overview", days], queryFn: () => getUsageOverview(days) });
