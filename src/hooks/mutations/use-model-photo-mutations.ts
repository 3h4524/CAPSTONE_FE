"use client";

import {
  createModelPhoto,
  deleteModelPhoto,
  generateModelPhoto,
  modelPhotoKeys,
  type ModelPhotoScope,
  type SaveModelPhotoInput,
  updateModelPhoto,
} from "@/api/model-photos";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupTemplate } from "@/types/mockup-templates";

export type SaveModelPhotoVariables = SaveModelPhotoInput & { id: string | null };

/** Creates a model photo, or changes one when `id` is given. */
export const useSaveModelPhoto = (scope: ModelPhotoScope) => {
  const queryClient = useAppQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: SaveModelPhotoVariables) =>
      id ? updateModelPhoto(scope, id, input) : createModelPhoto(scope, input),
    onSuccess: (photo, variables) => {
      queryClient.invalidateQueries({ queryKey: modelPhotoKeys.all });
      showToast("success", `${photo.name} was ${variables.id ? "saved" : "created"}.`);
    },
  });
};

type GenerateModelPhotoCallbacks = {
  /** The photo's link, as soon as it is drawn. */
  onPreview?: (url: string) => void;
  /** The saved photo. Called even when the dialog that started it has been closed meanwhile. */
  onSaved?: (photo: MockupTemplate) => void;
};

/** Makes a model photo with AI and keeps it; it then shows in the lists. */
export const useGenerateModelPhoto = (
  scope: ModelPhotoScope,
  { onPreview, onSaved }: GenerateModelPhotoCallbacks = {}
) => {
  const queryClient = useAppQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof generateModelPhoto>[1]) =>
      generateModelPhoto(scope, input, onPreview),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: modelPhotoKeys.all });
      showToast("success", `${photo.name} was made and added to your model photos.`);
      onSaved?.(photo);
    },
  });
};

export const useDeleteModelPhoto = (scope: ModelPhotoScope) => {
  const queryClient = useAppQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteModelPhoto(scope, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelPhotoKeys.all });
      showToast("success", "The model photo was deleted.");
    },
  });
};
