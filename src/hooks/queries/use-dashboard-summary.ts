"use client";

import { getDashboardSummary } from "@/api/seller-dashboard";
import { useQuery } from "@/hooks/queries/use-query";
import type { DashboardPeriod } from "@/types/seller-dashboard";

/** Every Seller Dashboard query sits under `all`, so one invalidation refreshes the whole page. */
export const sellerDashboardKeys = {
  all: ["seller-dashboard"] as const,
  summary: (days: DashboardPeriod) => [...sellerDashboardKeys.all, "summary", days] as const,
  actionItems: () => [...sellerDashboardKeys.all, "action-items"] as const,
  opportunities: () => [...sellerDashboardKeys.all, "opportunities"] as const,
};

const ACTIVE_BATCH_REFRESH_MS = 15_000;

/** The Seller's stage, the period's figures, the pipeline and the batch jobs still running. */
export const useDashboardSummary = (days: DashboardPeriod) =>
  useQuery({
    queryKey: sellerDashboardKeys.summary(days),
    queryFn: () => getDashboardSummary(days),
    staleTime: 30_000,
    // While a batch job runs, its progress bar should move without a reload.
    refetchInterval: (query) =>
      (query.state.data?.activeBatches.length ?? 0) > 0 ? ACTIVE_BATCH_REFRESH_MS : false,
    retry: false,
    suppressErrorToast: true,
  });
