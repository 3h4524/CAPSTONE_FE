"use client";

import { refreshSellerOpportunities } from "@/api/market-opportunities";
import { pickTopOpportunities } from "@/helpers/seller-dashboard";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { DASHBOARD_OPPORTUNITY_LIMIT } from "@/hooks/queries/use-dashboard-opportunities";
import { sellerDashboardKeys } from "@/hooks/queries/use-dashboard-summary";
import { useQueryClient } from "@tanstack/react-query";

// Market Radar's own list, so its page shows the new ranking without a reload.
const MARKET_RADAR_QUERY_KEY = ["seller-opportunities"];

/** Ranks every active niche for the Seller, the same as Market Radar's Refresh. */
export const useRankDashboardOpportunities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshSellerOpportunities,
    onSuccess: (ranked) => {
      queryClient.setQueryData(
        sellerDashboardKeys.opportunities(),
        pickTopOpportunities(ranked, DASHBOARD_OPPORTUNITY_LIMIT)
      );
      queryClient.invalidateQueries({ queryKey: MARKET_RADAR_QUERY_KEY });
    },
  });
};
