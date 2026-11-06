"use client";

import { adminPlanSettingsKeys, setRecommendedPlan } from "@/api/admin-plan-settings";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useSetRecommendedPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setRecommendedPlan,
    onSuccess: (settings) => {
      queryClient.setQueryData(adminPlanSettingsKeys.all, settings);
      showToast(
        "success",
        settings.recommendedPlanTier
          ? "Sellers now see this plan as Recommended."
          : "No plan is marked Recommended any more."
      );
    },
  });
};
