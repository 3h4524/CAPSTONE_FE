"use client";

import { deleteStylePreset, stylePresetKeys } from "@/api/style-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { StylePreset } from "@/types/style-presets";

export const useDeleteStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStylePreset(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<StylePreset[]>(stylePresetKeys.list(), (previous) => (previous ?? []).filter((item) => item.id !== id));
      showToast("success", "The art style was deleted.");
    },
  });
};
