"use client";
import { reviewDesignMockups, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

/** Approves or rejects a design's mock-ups as one product, then shows the product's mock-ups as saved. */
export const useReviewDesignMockups = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: reviewDesignMockups,
    onSuccess: (assets, { productId }) => client.setQueryData(videoWorkflowKeys.assets(productId), assets),
  });
};
