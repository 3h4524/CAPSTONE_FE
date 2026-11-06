"use client";

import { adminSubscriptionPlanKeys, duplicatePlan, reorderPlans } from "@/api/admin-subscription-plans";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

// Copies a plan under a new name and tier; the copy waits off sale for the Admin to check it.
export const useDuplicatePlan = (onDuplicated?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicatePlan,
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all });
      showToast("success", `${plan.name} was created from the copy. It is not on sale until you put it on sale.`);
      onDuplicated?.();
    },
  });
};

// Saves the order the plans were dragged into; the list is refreshed either way.
export const useReorderPlans = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderPlans,
    onSuccess: () => showToast("success", "Plan order saved. Sellers see the plans in this order."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all }),
  });
};
