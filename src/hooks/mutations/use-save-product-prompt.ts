"use client";

import { productPromptKeys, saveBatchProductPrompt } from "@/api/product-prompt";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { BatchProductPrompt, UpdateBatchProductPromptInput } from "@/types/product-prompt";

export type SaveProductPromptVariables = {
  rowId: string;
  input: UpdateBatchProductPromptInput;
};

export const useSaveProductPrompt = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ rowId, input }: SaveProductPromptVariables) => saveBatchProductPrompt(rowId, input),
    onSuccess: (prompt: BatchProductPrompt) => {
      queryClient.setQueryData(productPromptKeys.detail(prompt.rowId), prompt);
      showToast("success", "Prompt customization saved successfully.");
    },
  });
};
