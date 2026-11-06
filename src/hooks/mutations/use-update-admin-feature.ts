"use client";

import { adminFeatureKeys, updateAdminFeature } from "@/api/admin-features";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useUpdateAdminFeature = (onUpdated?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminFeature,
    onSuccess: async (feature) => {
      await queryClient.invalidateQueries({ queryKey: adminFeatureKeys.all });
      showToast("success", `${feature.label} was updated.`);
      onUpdated?.();
    },
  });
};
