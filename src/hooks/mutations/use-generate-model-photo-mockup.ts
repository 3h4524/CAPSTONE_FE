"use client";

import { generateModelPhotoMockup, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupAsset } from "@/types/video-workflow";

export const useGenerateModelPhotoMockup = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: generateModelPhotoMockup,
    // Asking for one made before returns that same image, so it is not listed twice.
    onSuccess: (asset) =>
      client.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(asset.productId), (old) => [
        asset,
        ...(old ?? []).filter((item) => item.id !== asset.id),
      ]),
  });
};
