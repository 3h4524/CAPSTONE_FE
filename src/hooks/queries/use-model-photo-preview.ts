"use client";

import { previewModelPhotoMockup } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export type ModelPhotoPreviewInput = {
  productId: string;
  garmentMockupId: string;
  modelPhotoId: string;
  garmentColor: string | null;
};

/** How a mock-up would look on a model photo. The same choices give the same image, so it is kept. */
export const useModelPhotoPreview = (input: ModelPhotoPreviewInput, enabled: boolean) =>
  useQuery({
    queryKey: [
      "model-photo-preview",
      input.productId,
      input.garmentMockupId,
      input.modelPhotoId,
      input.garmentColor,
    ],
    queryFn: () => previewModelPhotoMockup(input),
    enabled,
    staleTime: Infinity,
    suppressErrorToast: true,
  });
