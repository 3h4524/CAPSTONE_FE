"use client";

import {
  adminStyleArtPresetKeys,
  createAdminStyleArtPreset,
  type SaveAdminStyleArtPresetInput,
} from "@/api/admin-style-art-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

const sortPresets = (items: AdminStyleArtPreset[]) =>
  [...items].sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name));

export const useCreateAdminStyleArtPreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (input: SaveAdminStyleArtPresetInput) => createAdminStyleArtPreset(input),
    onSuccess: (preset) => {
      queryClient.setQueryData<AdminStyleArtPreset[]>(adminStyleArtPresetKeys.list(), (previous) =>
        sortPresets([...(previous ?? []), preset])
      );
      showToast("success", `${preset.name} was created.`);
    },
  });
};
