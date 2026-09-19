"use client";

import { adminSubscriptionPlanKeys, deleteAdminSubscriptionPlan } from "@/api/admin-subscription-plans";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteSubscriptionPlan = (onDeleted?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminSubscriptionPlan,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all });
      showToast(
        "success",
        result.hardDeleted ? "The plan was permanently deleted." : "The plan was deactivated."
      );
      onDeleted?.();
    },
  });
};
