"use client";

import { batchKeys, importBatchProducts } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import type { BatchProductImportRow } from "@/types/batches";
import { useQueryClient } from "@tanstack/react-query";

export const useImportBatchProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, products }: { batchId: string; products: BatchProductImportRow[] }) =>
      importBatchProducts(batchId, products),
    onSuccess: async (result, { batchId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchKeys.products(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
      if (result.importedCount > 0) showToast("success", `${result.importedCount} products imported.`);
    },
  });
};
