"use client";

import { adminSubscriptionPlanKeys, getAdminSubscriptionPlans } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminSubscriptionPlans = () =>
  useQuery({
    queryKey: adminSubscriptionPlanKeys.all,
    queryFn: getAdminSubscriptionPlans,
  });
