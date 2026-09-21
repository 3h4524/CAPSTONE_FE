"use client";

import { approveBatch, batchKeys } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useApproveBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveBatch,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchKeys.products(result.batchId) }),
      ]);
      showToast("success", `${result.queuedProductCount} products added to the design generation queue.`);
    },
  });
};
