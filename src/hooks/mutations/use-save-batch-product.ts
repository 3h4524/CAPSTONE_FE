"use client";

import { addBatchProduct, batchKeys, updateBatchProduct } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import type { SaveProductInput } from "@/types/batches";
import { useQueryClient } from "@tanstack/react-query";

type SaveProductVariables = SaveProductInput & { batchId: string; productId?: string };
export const useSaveBatchProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ productId, ...input }: SaveProductVariables) => productId ? updateBatchProduct({ ...input, productId }) : addBatchProduct(input), onSuccess: async (_, input) => { await Promise.all([queryClient.invalidateQueries({ queryKey: batchKeys.products(input.batchId) }), queryClient.invalidateQueries({ queryKey: batchKeys.all })]); showToast("success", input.productId ? "Product updated." : "Product added to the queue."); } });
};
