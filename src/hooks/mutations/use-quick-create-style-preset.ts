"use client";

import { quickCreateStylePreset, stylePresetKeys } from "@/api/style-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { StylePreset } from "@/types/style-presets";

export const useQuickCreateStylePreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (name: string) => quickCreateStylePreset(name),
    onSuccess: (preset: StylePreset) => {
      queryClient.setQueryData<StylePreset[]>(
        stylePresetKeys.list(),
        (previous) => [...(previous ?? []), preset].sort((left, right) => left.name.localeCompare(right.name))
      );
      showToast("success", `${preset.name} was created. Complete its details in My Styles when you have a moment.`);
    },
  });
};
