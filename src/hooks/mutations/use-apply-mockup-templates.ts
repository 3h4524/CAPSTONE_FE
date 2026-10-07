"use client";

import { applyBatchMockupTemplates, mockupTemplateKeys } from "@/api/mockup-templates";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { BatchMockupSelection } from "@/types/mockup-templates";

export type ApplyMockupTemplatesVariables = {
  batchJobId: string;
  templateIds: string[];
  garmentColors?: string[];
};

export const useApplyMockupTemplates = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ batchJobId, templateIds, garmentColors }: ApplyMockupTemplatesVariables) =>
      applyBatchMockupTemplates(batchJobId, templateIds, garmentColors),
    onSuccess: (selection: BatchMockupSelection) => {
      queryClient.setQueryData(mockupTemplateKeys.selection(selection.batchJobId), selection);
      showToast("success", "Mock-up templates applied.");
    },
  });
};
