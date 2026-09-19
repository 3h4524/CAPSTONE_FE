"use client";

import { adminSubscriptionPlanKeys, createAdminSubscriptionPlan } from "@/api/admin-subscription-plans";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useCreateSubscriptionPlan = (onCreated?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminSubscriptionPlan,
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all });
      showToast("success", `${plan.name} was created.`);
      onCreated?.();
    },
  });
};
