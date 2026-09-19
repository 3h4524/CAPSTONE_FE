"use client";

import { deleteStylePreset, stylePresetKeys } from "@/api/style-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useDeleteStylePreset = (onDeleted: () => void) => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStylePreset(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stylePresetKeys.all });
      showToast("success", "The art style was deleted.");
      onDeleted();
    },
  });
};
