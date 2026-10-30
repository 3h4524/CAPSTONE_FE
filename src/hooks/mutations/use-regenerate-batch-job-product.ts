"use client";

import { batchJobKeys, regenerateBatchJobProduct } from "@/api/batch-jobs";
import { batchKeys } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useRegenerateBatchJobProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateBatchJobProduct,
    onSuccess: async (result) => {
      // The job is running again: following it shows the new designs as they arrive. The product's prompt changed too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(result.batchJobId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
      showToast(
        "success",
        "Generating the product again. The new designs appear after the current ones."
      );
    },
  });
};
