"use client";

import { batchKeys, resetBatchProducts } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

// Sets failed products, or ones whose designs were all rejected, back to pending: they can then be edited
// and the next run generates designs for them again.
export const useResetBatchProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetBatchProducts,
    onSuccess: async ({ resetCount }, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchKeys.products(input.batchId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
      showToast("success", `${resetCount} product${resetCount === 1 ? " is" : "s are"} pending again. Run the workflow to generate new designs.`);
    },
  });
};
