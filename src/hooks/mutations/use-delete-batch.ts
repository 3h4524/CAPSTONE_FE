"use client";

import { batchKeys, deleteBatch } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBatch,
    onSuccess: async (_, batchId) => {
      await queryClient.invalidateQueries({ queryKey: batchKeys.all });
      await queryClient.removeQueries({ queryKey: batchKeys.products(batchId) });
      showToast("success", "Batch deleted.");
    },
  });
};
