"use client";

import { adminSubscriptionPlanKeys, getPlanInsights } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";

export const usePlanInsights = () =>
  useQuery({
    queryKey: adminSubscriptionPlanKeys.insights(),
    queryFn: () => getPlanInsights(),
    notifyError: { message: "Failed to load plan insights. Please try again." },
  });
