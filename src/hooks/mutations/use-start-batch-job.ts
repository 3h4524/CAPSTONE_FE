"use client";

import { batchJobKeys, startBatchJob } from "@/api/batch-jobs";
import { batchKeys } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useStartBatchJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startBatchJob,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(result.batchJobId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
      showToast("success", "Image generation started. This page updates automatically.");
    },
  });
};
