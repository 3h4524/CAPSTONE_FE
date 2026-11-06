"use client";

import { getDashboardActionItems } from "@/api/seller-dashboard";
import { sellerDashboardKeys } from "@/hooks/queries/use-dashboard-summary";
import { useQuery } from "@/hooks/queries/use-query";

/** The work that waits on the Seller, the most severe first. */
export const useDashboardActionItems = () =>
  useQuery({
    queryKey: sellerDashboardKeys.actionItems(),
    queryFn: getDashboardActionItems,
    staleTime: 30_000,
    retry: false,
    suppressErrorToast: true,
  });
