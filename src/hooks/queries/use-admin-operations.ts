"use client";

import { getAdminOperations } from "@/api/admin";
import { useQuery } from "@/hooks/queries/use-query";

/** Production, pipeline and AI figures for a Dashboard period ("day", "month" or "year"). */
export const useAdminOperations = (timeRange: string) =>
  useQuery({
    queryKey: ["admin", "dashboard", "operations", timeRange],
    queryFn: () => getAdminOperations(timeRange),
    retry: false,
    suppressErrorToast: true,
  });
