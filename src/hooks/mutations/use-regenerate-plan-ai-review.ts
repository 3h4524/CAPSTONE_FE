"use client";

import { adminSubscriptionPlanKeys, regeneratePlanAiReview } from "@/api/admin-subscription-plans";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";

export const useRegeneratePlanAiReview = () => {
  const queryClient = useAppQueryClient();

  return useMutation<PlanAiReviewResponse, void>({
    mutationFn: regeneratePlanAiReview,
    onSuccess: (data) => {
      queryClient.setQueryData(adminSubscriptionPlanKeys.aiReview(), data);
      showToast("success", "The AI review is being written. It takes a few minutes.");
    },
  });
};
