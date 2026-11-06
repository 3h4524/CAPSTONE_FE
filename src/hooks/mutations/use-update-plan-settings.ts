"use client";

import { adminPlanSettingsKeys, updatePlanSettings } from "@/api/admin-plan-settings";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useUpdatePlanSettings = (onUpdated?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlanSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(adminPlanSettingsKeys.all, settings);
      showToast("success", "Free and trial settings were saved. They apply at once.");
      onUpdated?.();
    },
  });
};
