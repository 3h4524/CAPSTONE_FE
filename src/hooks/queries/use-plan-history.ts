"use client";

import { adminSubscriptionPlanKeys, getPlanHistory } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";
import { keepPreviousData } from "@tanstack/react-query";

// One page of plan changes; the page shown stays while the next one loads.
export const usePlanHistory = (pageNumber: number, pageSize: number) =>
  useQuery({
    queryKey: adminSubscriptionPlanKeys.history(pageNumber, pageSize),
    queryFn: () => getPlanHistory(pageNumber, pageSize),
    placeholderData: keepPreviousData,
  });
