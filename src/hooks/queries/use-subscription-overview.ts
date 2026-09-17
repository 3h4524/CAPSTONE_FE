"use client";

import { getSubscriptionOverviewRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";

export const SUBSCRIPTION_OVERVIEW_QUERY_KEY = ["subscription-overview"];

export const useSubscriptionOverview = () =>
  useQuery({
    queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY,
    queryFn: getSubscriptionOverviewRequest,
    // MSG16 verbatim: shown regardless of the real underlying error (network, 500, etc.).
    notifyError: { message: "Failed to load data. Please try again." },
  });
