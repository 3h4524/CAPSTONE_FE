"use client";

import { productPromptKeys, restoreBatchProductPrompt } from "@/api/product-prompt";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { BatchProductPrompt } from "@/types/product-prompt";

export const useRestoreProductPrompt = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (rowId: string) => restoreBatchProductPrompt(rowId),
    onSuccess: (prompt: BatchProductPrompt) => {
      queryClient.setQueryData(productPromptKeys.detail(prompt.rowId), prompt);
      showToast("success", "Prompt restored to default.");
    },
  });
};
