"use client";

import { generateMockupImage, type GenerateMockupImageInput } from "@/api/mockup-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";

export type GenerateMockupImageVariables = { designImageId: string; input: GenerateMockupImageInput };

export const useGenerateMockupImage = () =>
  useMutation({
    mutationFn: ({ designImageId, input }: GenerateMockupImageVariables) => generateMockupImage(designImageId, input),
  });
