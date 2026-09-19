"use client";

import { createStylePreset, type SaveStylePresetInput,stylePresetKeys } from "@/api/style-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useCreateStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (input: SaveStylePresetInput) => createStylePreset(input),
    onSuccess: async (preset) => {
      await queryClient.invalidateQueries({ queryKey: stylePresetKeys.all });
      showToast("success", `${preset.name} was created.`);
    },
  });
};
