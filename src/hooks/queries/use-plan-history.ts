"use client";

import { adminSubscriptionPlanKeys, getPlanHistory } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";
import type { PlanHistoryAction } from "@/types/admin-subscription-plan";
import { keepPreviousData } from "@tanstack/react-query";

// One page of plan changes; the page shown stays while the next one loads.
export const usePlanHistory = (pageNumber: number, pageSize: number, action?: PlanHistoryAction) =>
  useQuery({
    queryKey: adminSubscriptionPlanKeys.history(pageNumber, pageSize, action),
    queryFn: () => getPlanHistory(pageNumber, pageSize, action),
    placeholderData: keepPreviousData,
  });
