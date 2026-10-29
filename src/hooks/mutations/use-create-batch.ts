"use client";

import { batchKeys, createBatch } from "@/api/batches";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createBatch, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: batchKeys.all }); showToast("success", "Batch created."); } });
};
