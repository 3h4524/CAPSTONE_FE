"use client";

import { createStylePreset, type SaveStylePresetInput,stylePresetKeys } from "@/api/style-presets";
import { sortPresetList } from "@/helpers/style-preset";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { StylePreset } from "@/types/style-presets";

export const useCreateStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (input: SaveStylePresetInput) => createStylePreset(input),
    onSuccess: (preset) => {
      queryClient.setQueryData<StylePreset[]>(stylePresetKeys.list(), (previous) => sortPresetList([...(previous ?? []), preset]));
      showToast("success", `${preset.name} was created.`);
    },
  });
};
