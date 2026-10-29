"use client";

import { batchKeys, updateBatch } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useUpdateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBatch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: batchKeys.all });
      showToast("success", "Batch updated.");
    },
  });
};
