"use client";

import { assistantKeys, confirmAssistantAction } from "@/api/assistant";
import { batchJobKeys } from "@/api/batch-jobs";
import { workflowKeys } from "@/api/workflows";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useConfirmAssistantAction = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: confirmAssistantAction,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["workflow-runs"] });
      void client.invalidateQueries({ queryKey: workflowKeys.all });
      void client.invalidateQueries({ queryKey: assistantKeys.conversations() });
      void client.invalidateQueries({ queryKey: assistantKeys.runProgresses() });
      void client.invalidateQueries({ queryKey: batchJobKeys.all });
      void client.invalidateQueries({ queryKey: ["run-groups"] });
      void client.invalidateQueries({ queryKey: ["mockup-assets"] });
    },
  });
};
