"use client";

import {
  adminStyleArtPresetKeys,
  type SaveAdminStyleArtPresetInput,
  updateAdminStyleArtPreset,
} from "@/api/admin-style-art-presets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

export type UpdateAdminStyleArtPresetVariables = SaveAdminStyleArtPresetInput & { id: string };

export const useUpdateAdminStyleArtPreset = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAdminStyleArtPresetVariables) => updateAdminStyleArtPreset(id, input),
    onSuccess: (preset) => {
      queryClient.setQueryData<AdminStyleArtPreset[]>(adminStyleArtPresetKeys.list(), (previous) =>
        (previous ?? []).map((item) => (item.id === preset.id ? preset : item))
      );
      showToast("success", `${preset.name} was saved.`);
    },
  });
};
