"use client";

import { batchKeys, deleteBatchProduct } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteBatchProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteBatchProduct, onSuccess: async (_, input) => { await Promise.all([queryClient.invalidateQueries({ queryKey: batchKeys.products(input.batchId) }), queryClient.invalidateQueries({ queryKey: batchKeys.all })]); showToast("success", "Product removed from the queue."); } });
};
