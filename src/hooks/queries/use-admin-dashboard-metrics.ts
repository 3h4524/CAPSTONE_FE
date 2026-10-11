"use client";

import { getAdminDashboardMetrics } from "@/api/admin";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminDashboardMetrics = (timeRange: string, enabled = true) =>
  useQuery({
    queryKey: ["admin", "dashboard", "metrics", timeRange],
    queryFn: () => getAdminDashboardMetrics(timeRange),
    enabled,
    retry: false,
    suppressErrorToast: true,
  });
