"use client";

import { type SaveStylePresetInput,stylePresetKeys, updateStylePreset } from "@/api/style-presets";
import { sortPresetList } from "@/helpers/style-preset";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { StylePreset } from "@/types/style-presets";

export type UpdateStylePresetVariables = SaveStylePresetInput & { id: string };

export const useUpdateStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateStylePresetVariables) => updateStylePreset(id, input),
    onSuccess: (preset) => {
      queryClient.setQueryData<StylePreset[]>(
        stylePresetKeys.list(),
        (previous) => sortPresetList((previous ?? []).map((item) => (item.id === preset.id ? preset : item)))
      );
      showToast("success", `${preset.name} was saved.`);
    },
  });
};
