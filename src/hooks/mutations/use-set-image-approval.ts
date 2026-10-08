"use client";

import { batchJobKeys, setDesignImageApproval } from "@/api/batch-jobs";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { BatchJobDetail, ImageApprovalResult, ImageApprovalStatus } from "@/types/batch-jobs";

export type SetImageApprovalVariables = {
  batchJobId: string;
  /** The images to change; null changes every image that is still pending. */
  designImageIds: string[] | null;
  status: ImageApprovalStatus;
};

// What the server will do, applied to the cached job so the buttons answer at once.
const withApproval = (job: BatchJobDetail, ids: string[] | null, status: ImageApprovalStatus): BatchJobDetail => ({
  ...job,
  products: job.products.map((product) => ({
    ...product,
    images: product.images.map((image) =>
      (ids ? ids.includes(image.id) : image.approvalStatus === "pending") ? { ...image, approvalStatus: status } : image
    ),
  })),
});

export const useSetImageApproval = () => {
  const queryClient = useAppQueryClient();

  return useMutation<ImageApprovalResult, SetImageApprovalVariables, { previous?: BatchJobDetail }>({
    mutationFn: ({ batchJobId, designImageIds, status }) => setDesignImageApproval(batchJobId, designImageIds, status),
    onMutate: async ({ batchJobId, designImageIds, status }) => {
      await queryClient.cancelQueries({ queryKey: batchJobKeys.detail(batchJobId) });
      const previous = queryClient.getQueryData<BatchJobDetail>(batchJobKeys.detail(batchJobId));
      if (previous) queryClient.setQueryData(batchJobKeys.detail(batchJobId), withApproval(previous, designImageIds, status));
      return { previous };
    },
    onError: (error, { batchJobId }, context) => {
      if (context?.previous) queryClient.setQueryData(batchJobKeys.detail(batchJobId), context.previous);
      showToast("error", getErrorMessage(error));
    },
    onSettled: (_data, _error, { batchJobId }) => {
      void queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(batchJobId) });
    },
  });
};
