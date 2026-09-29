"use client";

import { batchJobKeys, retryFailedBatchJob } from "@/api/batch-jobs";
import { batchKeys } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useRetryFailedBatchJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryFailedBatchJob,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(result.batchJobId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
      showToast("success", `Retrying ${result.queuedProductCount} failed ${result.queuedProductCount === 1 ? "product" : "products"}.`);
    },
  });
};
