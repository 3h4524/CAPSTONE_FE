"use client";

import { importGeneratedMockups } from "@/api/generated-mockups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useImportGeneratedMockups = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: importGeneratedMockups,
    onSuccess: (result, productId) => queryClient.setQueryData(videoWorkflowKeys.assets(productId), result.mockups),
  });
};
