"use client";

import { adminSubscriptionPlanKeys, getPlanAiReview } from "@/api/admin-subscription-plans";
import { useQuery } from "@/hooks/queries/use-query";

/** A review takes a few minutes to write; this is how often the page checks whether it is done. */
const POLL_INTERVAL_MS = 15_000;

export const usePlanAiReview = () =>
  useQuery({
    queryKey: adminSubscriptionPlanKeys.aiReview(),
    queryFn: getPlanAiReview,
    refetchInterval: (query) => (query.state.data?.isGenerating ? POLL_INTERVAL_MS : false),
    // The Revenue page only adds a note from it, so a failure there should not interrupt with a toast.
    suppressErrorToast: true,
  });
