"use client";

import { batchJobKeys, setDesignImageApproval } from "@/api/batch-jobs";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type {
  BatchJobDetail,
  GeneratedImage,
  ImageApprovalResult,
  ImageApprovalStatus,
} from "@/types/batch-jobs";

export type SetImageApprovalVariables = {
  batchJobId: string;
  /** The images to change; null changes every image that is still pending. */
  designImageIds: string[] | null;
  status: ImageApprovalStatus;
};

// The images of one product the change applies to. A product keeps one approved design, so approving "every
// remaining one" approves the first pending design of a product that has none approved yet.
const targetsOf = (
  images: GeneratedImage[],
  ids: string[] | null,
  status: ImageApprovalStatus
): string[] => {
  if (ids) return images.filter((image) => ids.includes(image.id)).map((image) => image.id);
  const pending = images.filter((image) => image.approvalStatus === "pending");
  if (status !== "approved") return pending.map((image) => image.id);
  if (images.some((image) => image.approvalStatus === "approved") || pending.length === 0)
    return [];
  const [first] = [...pending].sort((left, right) => left.variationIndex - right.variationIndex);
  return [first.id];
};

// What the server will do, applied to the cached job so the buttons answer at once: approving a design rejects the
// other designs of its product.
const withApproval = (
  job: BatchJobDetail,
  ids: string[] | null,
  status: ImageApprovalStatus
): BatchJobDetail => ({
  ...job,
  products: job.products.map((product) => {
    const targets = targetsOf(product.images, ids, status);
    if (targets.length === 0) return product;
    return {
      ...product,
      images: product.images.map((image) =>
        targets.includes(image.id)
          ? { ...image, approvalStatus: status }
          : status === "approved"
            ? { ...image, approvalStatus: "rejected" }
            : image
      ),
    };
  }),
});

export const useSetImageApproval = () => {
  const queryClient = useAppQueryClient();

  return useMutation<ImageApprovalResult, SetImageApprovalVariables, { previous?: BatchJobDetail }>(
    {
      mutationFn: ({ batchJobId, designImageIds, status }) =>
        setDesignImageApproval(batchJobId, designImageIds, status),
      onMutate: async ({ batchJobId, designImageIds, status }) => {
        await queryClient.cancelQueries({ queryKey: batchJobKeys.detail(batchJobId) });
        const previous = queryClient.getQueryData<BatchJobDetail>(batchJobKeys.detail(batchJobId));
        if (previous)
          queryClient.setQueryData(
            batchJobKeys.detail(batchJobId),
            withApproval(previous, designImageIds, status)
          );
        return { previous };
      },
      onError: (error, { batchJobId }, context) => {
        if (context?.previous)
          queryClient.setQueryData(batchJobKeys.detail(batchJobId), context.previous);
        showToast("error", getErrorMessage(error));
      },
      onSettled: (_data, _error, { batchJobId }) => {
        void queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(batchJobId) });
      },
    }
  );
};
