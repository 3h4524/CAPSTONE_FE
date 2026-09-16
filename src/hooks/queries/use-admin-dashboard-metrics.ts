"use client";

import { getAdminDashboardMetrics } from "@/api/admin";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminDashboardMetrics = (timeRange: string) =>
  useQuery({
    queryKey: ["admin", "dashboard", "metrics", timeRange],
    queryFn: () => getAdminDashboardMetrics(timeRange),
    retry: false,
    suppressErrorToast: true,
  });
