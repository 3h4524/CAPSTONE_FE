"use client";

import { type SaveStylePresetInput,stylePresetKeys, updateStylePreset } from "@/api/style-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export type UpdateStylePresetVariables = SaveStylePresetInput & { id: string };

export const useUpdateStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateStylePresetVariables) => updateStylePreset(id, input),
    onSuccess: async (preset) => {
      await queryClient.invalidateQueries({ queryKey: stylePresetKeys.all });
      showToast("success", `${preset.name} was saved.`);
    },
  });
};
