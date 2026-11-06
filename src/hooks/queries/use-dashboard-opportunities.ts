"use client";

import { getDashboardOpportunities } from "@/api/seller-dashboard";
import { sellerDashboardKeys } from "@/hooks/queries/use-dashboard-summary";
import { useQuery } from "@/hooks/queries/use-query";

export const DASHBOARD_OPPORTUNITY_LIMIT = 3;

/** The Seller's top Market Radar niches; empty until their ranking has been run once. */
export const useDashboardOpportunities = () =>
  useQuery({
    queryKey: sellerDashboardKeys.opportunities(),
    queryFn: () => getDashboardOpportunities(DASHBOARD_OPPORTUNITY_LIMIT),
    staleTime: 5 * 60_000,
    retry: false,
    suppressErrorToast: true,
  });
