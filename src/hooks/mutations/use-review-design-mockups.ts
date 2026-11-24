"use client";

import { reviewDesignMockupAssets, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupAsset } from "@/types/video-workflow";

export const useReviewDesignMockups = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: reviewDesignMockupAssets,
    onSuccess: (assets: MockupAsset[], variables) => {
      client.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(variables.productId), (old) => {
        if (!old) return assets;
        const updatedMap = new Map(assets.map((asset) => [asset.id, asset]));
        return old.map((asset) => updatedMap.get(asset.id) ?? asset);
      });
    },
  });
};
