"use client";

import { adminSubscriptionPlanKeys, getPlanFeatureImpact } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";

// Who a change to a plan feature would reach. Without limitValue it previews removing an on/off
// feature; with it, setting a limit (null = no limit).
export const usePlanFeatureImpact = (
  target: { planId: string; code: string; limitValue?: number | null } | null,
  enabled = true
) =>
  useQuery({
    queryKey: target
      ? adminSubscriptionPlanKeys.featureImpact(target.planId, target.code, target.limitValue)
      : [...adminSubscriptionPlanKeys.all, "impact", "none"],
    queryFn: () => getPlanFeatureImpact(target!),
    enabled: target !== null && enabled,
    staleTime: 30_000,
  });
