"use client";

import { adminSubscriptionPlanKeys, updateAdminSubscriptionPlan } from "@/api/admin-subscription-plans";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useUpdateSubscriptionPlan = (onUpdated?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminSubscriptionPlan,
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all });
      showToast("success", `${plan.name} was updated.`);
      onUpdated?.();
    },
  });
};
